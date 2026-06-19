import fs from 'fs';
import path from 'path';

const STATE_DIR = path.resolve(process.cwd(), '.homebase-state');
const GALLERY_FILE = process.env.IMAGE_GALLERY_FILE || path.join(STATE_DIR, 'image-gallery.json');

export async function listGalleryImages() {
  return readGallery();
}

export async function saveGalleryImage(item) {
  const images = await readGallery();
  const next = [item, ...images.filter(image => image.id !== item.id)];
  await writeGallery(next);
  return item;
}

export async function deleteGalleryImage(id) {
  const images = await readGallery();
  const next = images.filter(image => image.id !== id);
  await writeGallery(next);
  return next.length !== images.length;
}

async function readGallery() {
  try {
    const raw = await fs.promises.readFile(GALLERY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeGallery(items) {
  await fs.promises.mkdir(path.dirname(GALLERY_FILE), { recursive: true });
  const tmpPath = `${GALLERY_FILE}.${process.pid}.tmp`;
  await fs.promises.writeFile(tmpPath, JSON.stringify(items, null, 2), 'utf8');
  await fs.promises.rename(tmpPath, GALLERY_FILE);
}
