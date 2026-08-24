import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

// Buffered in memory (not written to disk) until fileFilter + a magic-byte
// sniff both pass — the client-reported mimetype/extension are only used as
// a fast first filter, never trusted for the final decision.
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
      cb(new Error('Only PNG, JPEG, or WEBP images are allowed.'));
      return;
    }
    cb(null, true);
  },
});

const MAGIC_SIGNATURES: { ext: string; check: (buf: Buffer) => boolean }[] = [
  { ext: '.png', check: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: '.jpg', check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: '.webp', check: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
];

/** Sniffs the real file type from content. Returns null if it doesn't match any allowed image format. */
export function sniffImageExtension(buf: Buffer): string | null {
  const match = MAGIC_SIGNATURES.find((sig) => sig.check(buf));
  return match ? match.ext : null;
}

/**
 * Persists an already-validated image buffer under UPLOAD_DIR/subdir with a
 * server-generated UUID filename (never the client's filename or extension),
 * which rules out path traversal and extension spoofing by construction.
 * Returns the public URL path to serve it from (see the /uploads static
 * route in index.ts).
 */
export async function saveImageBuffer(buf: Buffer, subdir: string): Promise<string> {
  const ext = sniffImageExtension(buf);
  if (!ext) {
    throw new Error('File content does not match a supported image format (PNG, JPEG, WEBP).');
  }

  const safeSubdir = subdir.replace(/[^a-z0-9_-]/gi, '');
  const dir = path.resolve(config.uploadDir, safeSubdir);
  await fs.promises.mkdir(dir, { recursive: true });

  const filename = `${uuidv4()}${ext}`;
  await fs.promises.writeFile(path.join(dir, filename), buf);

  return `/uploads/${safeSubdir}/${filename}`;
}
