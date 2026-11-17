const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Configure Multer for in-memory buffer (stream directly to Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB maximum for compressed video / audio / photos
  },
});

/**
 * Upload buffer directly to Cloudinary
 * @param {Buffer} buffer 
 * @param {string} folder 
 * @param {string} resource_type 'image' | 'video' | 'auto' | 'raw'
 * @returns {Promise<{url: string, public_id: string, resource_type: string}>}
 */
const uploadToCloudinary = (buffer, folder = 'roomchat_media', resource_type = 'auto') => {
  return new Promise((resolve, reject) => {
    // If Cloudinary keys are missing, gracefully generate a data URI fallback
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
      console.warn('⚠️ Cloudinary keys not configured. Falling back to data URI / local representation.');
      const base64 = buffer.toString('base64');
      const mime = resource_type === 'video' ? 'video/mp4' : (resource_type === 'audio' ? 'audio/webm' : 'image/jpeg');
      return resolve({
        url: `data:${mime};base64,${base64}`,
        public_id: `mock_${Date.now()}`,
        resource_type,
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          duration: result.duration,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

module.exports = {
  cloudinary,
  upload,
  uploadToCloudinary,
};

