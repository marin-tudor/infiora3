import fs from 'fs';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
]);

const storage = multer.diskStorage({
  destination(_req: any, _file: any, cb: any) {
    fs.mkdirSync('uploads/tmp', { recursive: true });
    cb(null, 'uploads/tmp');
  },
  filename(_req: any, file: any, cb: any) {
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const multerUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    cb(null, allowedMimeTypes.has((file.mimetype || '').toLowerCase()));
  },
});

export default multerUpload;
