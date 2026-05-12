const cloudinary = require('cloudinary').v2;

// Validate Cloudinary environment variables
const validateCloudinaryConfig = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.warn(
      '\n⚠️  WARNING: Cloudinary environment variables are missing!\n' +
      'Set the following in your .env file to enable file uploads:\n' +
      '  - CLOUDINARY_CLOUD_NAME\n' +
      '  - CLOUDINARY_API_KEY\n' +
      '  - CLOUDINARY_API_SECRET\n' +
      'Uploads will fail until these are configured.\n'
    );
    return false;
  }
  return true;
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Validate on startup
const isConfigured = validateCloudinaryConfig();

module.exports = {
  cloudinary,
  isConfigured,
  validateCloudinaryConfig,
};
