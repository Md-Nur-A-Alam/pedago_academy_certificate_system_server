const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('../src/config/env');
const Competition = require('../src/models/Competition');

async function uploadToPostimages(buffer, originalname = 'upload.jpg') {
  const apiKey = env.POSTIMAGE_API_KEY || '9b5b67a2f3e9d58b62f73aef25b0545f';
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
    signal: AbortSignal.timeout(30000),
  });

  const xml = await res.text();
  const hotlinkMatch = xml.match(/<hotlink>([^<]+)<\/hotlink>/i);
  if (hotlinkMatch && hotlinkMatch[1]) {
    return hotlinkMatch[1].trim();
  }
  throw new Error('Postimages upload failed: ' + xml);
}

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const comp = await Competition.findById('6ab0d946519518b7ed7ef80a');
  if (!comp) {
    console.log('Competition not found');
    return;
  }

  const uploadsDir = path.resolve(__dirname, '../uploads');

  for (let i = 0; i < comp.categoryGroups.length; i++) {
    const group = comp.categoryGroups[i];
    const newPics = [];
    for (const picUrl of group.pictures || []) {
      if (picUrl.includes('localhost') || picUrl.includes('/uploads/')) {
        const filename = path.basename(picUrl);
        const localFilePath = path.join(uploadsDir, filename);
        if (fs.existsSync(localFilePath)) {
          console.log(`Uploading ${filename} to Postimages...`);
          const buffer = fs.readFileSync(localFilePath);
          const postimageUrl = await uploadToPostimages(buffer, filename);
          console.log(`Uploaded: ${postimageUrl}`);
          newPics.push(postimageUrl);
        } else {
          newPics.push(picUrl);
        }
      } else {
        newPics.push(picUrl);
      }
    }
    comp.categoryGroups[i].pictures = newPics;
  }

  comp.markModified('categoryGroups');
  await comp.save();
  console.log('Updated competition category groups successfully!');

  // Verify
  const updatedComp = await Competition.findById('6ab0d946519518b7ed7ef80a');
  console.log('Updated categoryGroups:');
  updatedComp.categoryGroups.forEach((g, idx) => {
    console.log(` Group ${idx + 1}:`, g.pictures);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
