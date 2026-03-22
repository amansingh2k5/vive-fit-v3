import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { upload, uploadToCloudinary, cloudinary } from '../middleware/upload.js';
import User from '../models/User.js';

const router = express.Router();
router.use(verifyToken);

// ── POST /api/upload/physique ──────────────────────────────
// multer puts the file in req.file.buffer (memoryStorage)
// then we stream it to Cloudinary v2 ourselves
router.post('/physique', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    // Upload buffer → Cloudinary
    const { url, publicId } = await uploadToCloudinary(req.file.buffer);

    const photo = { url, publicId };

    // Push to user, keep latest 12
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { physiquePhotos: { $each: [photo], $slice: -12 } } },
      { new: true }
    );

    res.json({ photo, allPhotos: user.physiquePhotos });
  } catch (err) { next(err); }
});

// ── DELETE /api/upload/physique/:publicId ──────────────────
// publicId from Cloudinary includes the folder prefix, e.g. "vibefit/physique/filename"
// The client should send the full publicId (URL-encoded if needed)
router.delete('/physique/:publicId(*)', async (req, res, next) => {
  try {
    const publicId = req.params.publicId;           // e.g. "vibefit/physique/abc123"

    await cloudinary.uploader.destroy(publicId);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { physiquePhotos: { publicId } } },
      { new: true }
    );

    res.json({ allPhotos: user.physiquePhotos });
  } catch (err) { next(err); }
});

export default router;
