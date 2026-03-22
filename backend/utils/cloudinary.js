const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const makeUpload = (folder) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `freshmart/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });
  return multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
};

module.exports = { cloudinary, makeUpload };
