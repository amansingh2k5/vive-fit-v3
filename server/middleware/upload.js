import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import streamifier from 'streamifier';

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
};

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, WEBP images are allowed.'), false);
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

export const uploadToCloudinary = (buffer, folder = 'vibefit/physique') =>
  new Promise((resolve, reject) => {
    const cld = configureCloudinary();

    if (!process.env.CLOUDINARY_CLOUD_NAME ||
        process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name' ||
        process.env.CLOUDINARY_CLOUD_NAME.trim() === '') {
      return reject(Object.assign(
        new Error('Cloudinary not configured — add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to server/.env'),
        { statusCode: 503 }
      ));
    }

    const stream = cld.uploader.upload_stream(
      { folder, transformation: [{ width: 1080, height: 1350, crop: 'limit', quality: 'auto:good' }] },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

export { cloudinary };
