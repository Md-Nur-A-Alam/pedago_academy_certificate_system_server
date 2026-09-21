const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');



/**
 * Upload to Postimages (postimages.org / postimg.cc)
 */
const uploadToPostimages = async (buffer, originalname) => {
  const apiKey = env.POSTIMAGE_API_KEY || process.env.POSTIMAGE_API_KEY || '9b5b67a2f3e9d58b62f73aef25b0545f';
  if (!apiKey) return null;

  try {
    const ext = (path.extname(originalname) || '.jpg').replace('.', '').toLowerCase() || 'jpg';
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
      signal: AbortSignal.timeout(30000), // 30s timeout for large images
    });

    const xml = await res.text();
    const hotlinkMatch = xml.match(/<hotlink>([^<]+)<\/hotlink>/i);
    const pageMatch = xml.match(/<page>([^<]+)<\/page>/i);

    if (hotlinkMatch && hotlinkMatch[1]) {
      return {
        success: true,
        url: hotlinkMatch[1].trim(),
        displayUrl: pageMatch ? pageMatch[1].trim() : hotlinkMatch[1].trim(),
        provider: 'postimage',
      };
    }

    const errorMatch = xml.match(/<error>([^<]+)<\/error>/i);
    console.warn('[Postimages Warning]:', errorMatch ? errorMatch[1] : 'Upload failed: ' + xml.substring(0, 200));
  } catch (err) {
    console.warn('[Postimages Warning]: Postimages unavailable. Trying next cloud provider...', err.message);
  }
  return null;
};

/**
 * Upload to ImgBB
 */
const uploadToImgbb = async (buffer, originalname) => {
  const apiKey = env.IMGBB_API_KEY || process.env.IMGBB_API_KEY || '8d8681f7efba818251ffb798dc2e6aaa';
  const uploadUrl = env.IMGBB_UPLOAD_URL || process.env.IMGBB_UPLOAD_URL || 'https://api.imgbb.com/1/upload';

  if (!apiKey) return null;

  try {
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
      signal: AbortSignal.timeout(20000), // 20s timeout
    });

    const json = await res.json();

    if (json.success && json.data) {
      return {
        success: true,
        url: json.data.url || json.data.display_url,
        displayUrl: json.data.display_url,
        provider: 'imgbb',
      };
    }

    console.warn('[ImgBB Upload Warning]:', json.error?.message || json);
  } catch (err) {
    console.warn('[ImgBB Warning]: ImgBB unavailable. Trying next cloud provider...', err.message);
  }
  return null;
};

/**
 * Upload an image buffer across cloud providers (Postimages <-> ImgBB)
 * strictly avoids saving on local server storage.
 */
const uploadImageBuffer = async (buffer, originalname = 'image.jpg') => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Image file is empty or corrupted.');
  }

  // Cloud provider chain: Try Postimages and ImgBB
  const providers = [
    { name: 'Postimages', fn: uploadToPostimages },
    { name: 'ImgBB', fn: uploadToImgbb },
  ];

  const errors = [];
  for (const { name, fn } of providers) {
    try {
      const result = await fn(buffer, originalname);
      if (result && result.success && result.url) {
        return result;
      }
      errors.push(`${name} failed`);
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
    }
  }

  // If initial pass fails, retry Postimages one more time
  try {
    const retryResult = await uploadToPostimages(buffer, originalname);
    if (retryResult && retryResult.success && retryResult.url) {
      return retryResult;
    }
  } catch (retryErr) {
    errors.push(`Postimages retry: ${retryErr.message}`);
  }

  throw new Error(
    `Image cloud upload failed on both Postimages and ImgBB (${errors.join(', ')}). Please verify image format or try again.`
  );
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
