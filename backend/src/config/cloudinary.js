const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
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
 * Upload buffer directly to Cloudinary with automatic resilient fallback
 * @param {Buffer} buffer 
 * @param {string} folder 
 * @param {string} resource_type 'image' | 'video' | 'auto' | 'raw'
 * @returns {Promise<{url: string, public_id: string, resource_type: string}>}
 */
const uploadToCloudinary = (buffer, folder = 'roomchat_media', resource_type = 'auto') => {
  return new Promise((resolve) => {
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();

    const generateFallback = (reason) => {
      console.warn(`⚠️ Cloudinary bypass (${reason}). Using high-performance inline base64 fallback.`);
      const base64 = buffer.toString('base64');
      const mime = resource_type === 'video' ? 'video/mp4' : (resource_type === 'audio' ? 'audio/webm' : 'image/jpeg');
      return resolve({
        url: `data:${mime};base64,${base64}`,
        public_id: `fallback_${Date.now()}`,
        resource_type,
      });
    };

    // If Cloudinary keys are missing or placeholder
    if (!cloudName || cloudName === 'your_cloud_name') {
      return generateFallback('No Cloudinary credentials provided');
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type,
        timeout: 10000,
      },
      (error, result) => {
        if (error) {
          console.warn(`⚠️ Cloudinary Upload Error: ${error.message} (HTTP ${error.http_code || 'unknown'}).`);
          // Fallback seamlessly so the user's photo/voice note never fails to deliver!
          return generateFallback(error.message);
        }
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
