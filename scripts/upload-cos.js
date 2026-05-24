// Upload dist/ to Tencent COS static website hosting
// Usage: node scripts/upload-cos.js
const fs = require('fs');
const path = require('path');
const COS = require('cos-nodejs-sdk-v5');

const SECRET_ID = process.env.COS_SECRET_ID;
const SECRET_KEY = process.env.COS_SECRET_KEY;
if (!SECRET_ID || !SECRET_KEY) {
  console.error('❌ 请设置环境变量 COS_SECRET_ID 和 COS_SECRET_KEY');
  console.error('   Windows: $env:COS_SECRET_ID="xxx"; $env:COS_SECRET_KEY="yyy"');
  process.exit(1);
}
const BUCKET = 'modular-med-learn-1436435669';
const REGION = 'ap-nanjing';
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const cos = new COS({ SecretId: SECRET_ID, SecretKey: SECRET_KEY });

function walk(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(DIST_DIR, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push({ localPath: full, key: rel });
    }
  }
  return results;
}

async function upload() {
  const files = walk(DIST_DIR);
  console.log(`Found ${files.length} files to upload\n`);

  for (let i = 0; i < files.length; i++) {
    const { localPath, key } = files[i];
    const content = fs.readFileSync(localPath);
    const ext = path.extname(localPath).slice(1);
    const mimeMap = {
      html: 'text/html',
      js: 'application/javascript',
      css: 'text/css',
      png: 'image/png',
      ico: 'image/x-icon',
      json: 'application/json',
      svg: 'image/svg+xml',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: BUCKET,
        Region: REGION,
        Key: key,
        Body: content,
        ContentType: contentType,
        CacheControl: key.includes('static/') ? 'max-age=31536000' : 'no-cache',
        ContentDisposition: 'inline',
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    console.log(`  [${i + 1}/${files.length}] ✓ ${key}`);
  }

  // Also upload index.html as root (for SPA routing)
  const indexContent = fs.readFileSync(path.join(DIST_DIR, 'index.html'));
  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: BUCKET,
      Region: REGION,
      Key: 'index.html',
      Body: indexContent,
      ContentType: 'text/html',
      CacheControl: 'no-cache',
      ContentDisposition: 'inline',
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  console.log('\n✅ Upload complete!');
  console.log('   URL: https://modular-med-learn-1436435669.cos-website.ap-nanjing.myqcloud.com');
}

upload().catch(err => {
  console.error('❌ Upload failed:', err.message || err);
  process.exit(1);
});
