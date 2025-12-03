import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const saveFileToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    if (!buffer) {
      return reject(new Error('No buffer provided'));
    }

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);

    const uploadOptions = {
      resource_type: 'image',
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'uploads',
      overwrite: true,
      unique_filename: false,
      use_filename: true,
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    readable.pipe(stream);
  });
};
