const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure local uploads directory exists as fallback
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Save image buffer locally as a fallback
 */
const saveLocally = async (buffer, originalname = 'upload.jpg') => {
  const ext = path.extname(originalname) || '.jpg';
  const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const filePath = path.join(UPLOADS_DIR, uniqueName);
    await fs.promises.writeFile(filePath, buffer);
    const baseUrl = env.SERVER_URL || '';
    return `${baseUrl}/uploads/${uniqueName}`;
  } catch (fsErr) {
    console.warn('[Local Storage Fallback Warning]:', fsErr.message);
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
        ? 'image/webp'
        : ext === '.gif'
        ? 'image/gif'
        : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }
};

// Circuit breakers to avoid latency when a provider is down
let imgbbIsDown = false;
let imgbbLastCheck = 0;
let postimageIsDown = false;
let postimageLastCheck = 0;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown before retrying down provider

/**
 * Upload to ImgBB
 */
const uploadToImgbb = async (buffer, originalname) => {
  const apiKey = env.IMGBB_API_KEY || process.env.IMGBB_API_KEY;
  const uploadUrl = env.IMGBB_UPLOAD_URL || process.env.IMGBB_UPLOAD_URL || 'https://api.imgbb.com/1/upload';

  if (!apiKey) return null;

  const now = Date.now();
  if (imgbbIsDown && now - imgbbLastCheck < COOLDOWN_MS) {
    return null;
  }

  try {
    imgbbLastCheck = now;
    const base64Image = buffer.toString('base64');
    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('image', base64Image);
    formData.append('name', path.parse(originalname).name || 'upload');

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      body: formData,
      signal: AbortSignal.timeout(2500),
    });

    const json = await res.json();

    if (json.success && json.data) {
      imgbbIsDown = false;
      return {
        success: true,
        url: json.data.url || json.data.display_url,
        displayUrl: json.data.display_url,
        provider: 'imgbb',
      };
    }

    console.warn('[ImgBB Upload Warning]:', json.error?.message || json);
    imgbbIsDown = true;
  } catch (err) {
    console.warn('[ImgBB Network Warning]: ImgBB unavailable. Trying next provider.', err.message);
    imgbbIsDown = true;
  }
  return null;
};

/**
 * Upload to Postimages (postimages.org / postimg.cc)
 */
const uploadToPostimages = async (buffer, originalname) => {
  const apiKey = env.POSTIMAGE_API_KEY || process.env.POSTIMAGE_API_KEY;
  if (!apiKey) return null;

  const now = Date.now();
  if (postimageIsDown && now - postimageLastCheck < COOLDOWN_MS) {
    return null;
  }

  try {
    postimageLastCheck = now;
    const ext = (path.extname(originalname) || '.png').replace('.', '').toLowerCase() || 'png';
    const baseName = path.parse(originalname).name || 'upload';

    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('o', '2b819584285c102318568238c7d4a4c7');
    params.append('m', '59c2ad4b46b0c1e12d5703302bff0120');
    params.append('version', '1.0.1');
    params.append('portable', '1');
    params.append('name', baseName);
    params.append('type', ext === 'jpeg' ? 'jpg' : ext);
    params.append('image', buffer.toString('base64'));

    const res = await fetch('https://api.postimage.org/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PostImage/1.0.1',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(5000),
    });

    const xml = await res.text();
    const hotlinkMatch = xml.match(/<hotlink>([^<]+)<\/hotlink>/i);
    const pageMatch = xml.match(/<page>([^<]+)<\/page>/i);

    if (hotlinkMatch && hotlinkMatch[1]) {
      postimageIsDown = false;
      return {
        success: true,
        url: hotlinkMatch[1].trim(),
        displayUrl: pageMatch ? pageMatch[1].trim() : hotlinkMatch[1].trim(),
        provider: 'postimage',
      };
    }

    const errorMatch = xml.match(/<error>([^<]+)<\/error>/i);
    console.warn('[Postimages Warning]:', errorMatch ? errorMatch[1] : 'Upload failed');
    postimageIsDown = true;
  } catch (err) {
    console.warn('[Postimages Warning]: Postimages unavailable. Trying next provider.', err.message);
    postimageIsDown = true;
  }
  return null;
};

/**
 * Upload an image buffer across providers (ImgBB <-> Postimages) with local storage fallback
 */
const uploadImageBuffer = async (buffer, originalname = 'image.jpg') => {
  // If user configured preferred provider or if ImgBB is known down, prioritize Postimages
  const preferred = (env.IMAGE_PROVIDER || process.env.IMAGE_PROVIDER || '').toLowerCase();

  let providers;
  if (preferred === 'postimage' || preferred === 'postimages' || imgbbIsDown) {
    providers = [uploadToPostimages, uploadToImgbb];
  } else {
    providers = [uploadToImgbb, uploadToPostimages];
  }

  for (const uploadFn of providers) {
    const result = await uploadFn(buffer, originalname);
    if (result && result.success && result.url) {
      return result;
    }
  }

  // Local fallback storage if all external cloud providers are unavailable
  const localUrl = await saveLocally(buffer, originalname);
  return {
    success: true,
    url: localUrl,
    displayUrl: localUrl,
    provider: 'local',
    notice: 'Image uploaded and saved to server storage.',
  };
};

/**
 * Detect or extract an image from an external URL (e.g. Facebook CDN, Facebook post, or web link)
 */
const processImageFromUrl = async (inputUrl) => {
  if (!inputUrl || typeof inputUrl !== 'string') {
    throw new Error('A valid URL is required');
  }

  const trimmedUrl = inputUrl.trim();

  // Case 1: Direct Image URL or Facebook CDN media URL (scontent...fbcdn.net, cdn, jpg, png, webp, etc.)
  const isDirectImage =
    trimmedUrl.includes('fbcdn.net') ||
    trimmedUrl.includes('scontent') ||
    trimmedUrl.includes('ibb.co') ||
    trimmedUrl.includes('postimg.cc') ||
    trimmedUrl.includes('postimages.org') ||
    trimmedUrl.includes('imgur.com') ||
    /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(trimmedUrl);

  if (isDirectImage) {
    try {
      const response = await fetch(trimmedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const html = await response.text();
        const ogMatch =
          html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
        if (ogMatch && ogMatch[1]) {
          const directUrl = ogMatch[1].replace(/&amp;/g, '&');
          return await processImageFromUrl(directUrl);
        }
        throw new Error('The URL points to a web page without an image preview.');
      }

      if (!contentType.includes('image')) {
        throw new Error('The URL did not return a recognized image.');
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload across providers to convert link into permanent host
      return await uploadImageBuffer(buffer, 'imported_image.jpg');
    } catch (err) {
      throw new Error(`Could not download image from URL: ${err.message}`);
    }
  }

  // Case 2: Facebook Post / Photo Link (e.g. facebook.com/photo/...)
  if (trimmedUrl.includes('facebook.com') || trimmedUrl.includes('fb.watch')) {
    // Attempt Open Graph extraction
    try {
      const fbResponse = await fetch(trimmedUrl, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      const html = await fbResponse.text();
      const ogMatch =
        html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

      if (ogMatch && ogMatch[1] && !ogMatch[1].includes('facebook_logo')) {
        const decodedImageUrl = ogMatch[1].replace(/&amp;/g, '&');
        // Fetch and re-upload the extracted image
        return await processImageFromUrl(decodedImageUrl);
      }
    } catch (e) {
      // Fall through to informative error
    }

    throw new Error(
      "Facebook restricts automated bots from accessing post pages directly. To use this Facebook image, please right-click the image on Facebook, select 'Copy image address', and paste that link here, or upload the downloaded image file directly."
    );
  }

  // Case 3: Other Webpage URLs (Extract Open Graph meta tag)
  try {
    const webResponse = await fetch(trimmedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });

    const html = await webResponse.text();
    const ogMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    if (ogMatch && ogMatch[1]) {
      const extractedUrl = ogMatch[1].replace(/&amp;/g, '&');
      return await processImageFromUrl(extractedUrl);
    }

    throw new Error('No preview or Open Graph image found on the provided page.');
  } catch (err) {
    throw new Error(err.message || 'Failed to detect image from URL');
  }
};

module.exports = {
  uploadImageBuffer,
  processImageFromUrl,
};
