import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';

const MAX_VIDEO_SIDE = 1920;
const VIDEO_FPS = 24;

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1920;
const IMAGE_QUALITY = 80;

async function buildCompressedFile(file) {
  if (!file || !file.buffer || !file.mimetype?.startsWith('image/')) return file;
  if (file.mimetype === 'image/svg+xml' || file.mimetype === 'image/gif') return file;

  const buffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: MAX_IMAGE_WIDTH, height: MAX_IMAGE_HEIGHT, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: IMAGE_QUALITY })
    .toBuffer();

  const parsedName = path.parse(file.originalname || 'image');
  return { ...file, buffer, size: buffer.length, mimetype: 'image/webp', originalname: `${parsedName.name || 'image'}.webp` };
}

// Run one video encode at a time so the small VPS keeps CPU for the site
let videoQueue = Promise.resolve();

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr = (stderr + d).slice(-2000); });
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-300)}`))));
  });
}

async function encodeVideo(file) {
  if (!ffmpegPath) throw new Error('ffmpeg binary not found');
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inPath = path.join(os.tmpdir(), `in_${id}${path.extname(file.originalname || '') || '.mp4'}`);
  const outPath = path.join(os.tmpdir(), `out_${id}.mp4`);
  try {
    await fs.writeFile(inPath, file.buffer);
    await runFfmpeg([
      '-y', '-i', inPath,
      '-vf', `scale=w='min(iw,${MAX_VIDEO_SIDE})':h='min(ih,${MAX_VIDEO_SIDE})':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=${VIDEO_FPS}`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
      '-maxrate', '3000k', '-bufsize', '6000k', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '96k', '-ac', '1',
      '-movflags', '+faststart', '-threads', '1',
      outPath,
    ]);
    const buffer = await fs.readFile(outPath);
    const parsedName = path.parse(file.originalname || 'video');
    return { ...file, buffer, size: buffer.length, mimetype: 'video/mp4', originalname: `${parsedName.name || 'video'}.mp4` };
  } finally {
    await Promise.allSettled([fs.unlink(inPath), fs.unlink(outPath)]);
  }
}

function compressVideo(file) {
  const job = videoQueue.then(() => encodeVideo(file));
  videoQueue = job.catch(() => {});
  return job;
}

export async function uploadToCloudflare(propertyId, assetType, file) {
  if (!process.env.CF_WORKER_UPLOAD_URL) throw new Error('CF_WORKER_UPLOAD_URL not set');

  const isVideo = file?.mimetype?.startsWith('video/');
  const compressedFile = isVideo ? await compressVideo(file) : await buildCompressedFile(file);
  const fd = new FormData();
  const blob = new Blob([compressedFile.buffer], { type: compressedFile.mimetype });

  fd.append('file', blob, compressedFile.originalname);
  fd.append('propertyId', propertyId.toString());
  fd.append('assetType', assetType);

  const cfRes = await fetch(process.env.CF_WORKER_UPLOAD_URL, { method: 'POST', body: fd });
  const data = await cfRes.json();
  if (!cfRes.ok) throw new Error(data.error || `Worker returned ${cfRes.status}`);

  return { key: data.key, url: data.url, file: compressedFile };
}

export async function deleteFromCloudflare(fileUrl) {
  if (!fileUrl || !process.env.CF_WORKER_UPLOAD_URL) return;
  try {
    const filename = new URL(fileUrl).pathname.split('/').pop();
    const deleteUrl = process.env.CF_WORKER_UPLOAD_URL.replace('/upload', `/files/${filename}`);
    await fetch(deleteUrl, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
  } catch {
  }
}

export async function fileFromRequest(formDataFile) {
  const buffer = Buffer.from(await formDataFile.arrayBuffer());
  return { buffer, mimetype: formDataFile.type, originalname: formDataFile.name, size: formDataFile.size };
}
