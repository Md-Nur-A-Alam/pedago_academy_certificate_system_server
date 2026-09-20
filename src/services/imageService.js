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
  const filePath = path.join(UPLOADS_DIR, uniqueName);
  await fs.promises.writeFile(filePath, buffer);
  return `${env.SERVER_URL}/uploads/${uniqueName}`;
};

/**
 * Upload an image buffer to ImgBB (with automatic local storage fallback)
 */
const uploadImageBuffer = async (buffer, originalname = 'image.jpg') => {
  const apiKey = env.IMGBB_API_KEY || process.env.IMGBB_API_KEY;
  const uploadUrl = env.IMGBB_UPLOAD_URL || process.env.IMGBB_UPLOAD_URL || 'https://api.imgbb.com/1/upload';

  if (apiKey) {
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
      console.warn('[ImgBB Network Warning]:', err.message);
    }
  }

  // Local fallback storage
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
      if (!contentType.includes('image') && !isDirectImage) {
        throw new Error('The URL did not return a recognized image.');
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to ImgBB/storage to convert temporary CDN link into permanent host
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
