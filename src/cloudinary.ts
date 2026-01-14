// Cloudinary Configuration for Secure Signed Image Uploads
// Uses Cloudflare Worker for secure signature generation

import type { CloudinaryUploadResult } from './types';

// Cloudflare Worker URL - update after deployment
const WORKER_URL = import.meta.env.VITE_CLOUDINARY_WORKER_URL || 'http://localhost:8787';

// Signature response from Cloudflare Worker
interface SignatureResponse {
  signature: string;
  timestamp: number;
  folder: string;
  cloudName: string;
  apiKey: string;
}

// Get signed upload parameters from Cloudflare Worker
const getUploadSignature = async (): Promise<SignatureResponse> => {
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get upload signature');
  }

  return response.json();
};

// Upload image to Cloudinary with signed parameters
export const uploadToCloudinary = async (file: File): Promise<CloudinaryUploadResult> => {
  try {
    // Get signature from Cloudflare Worker
    const { signature, timestamp, folder, cloudName, apiKey } = await getUploadSignature();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cloudinary upload response error:', errorData);
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return {
      url: optimizeCloudinaryUrl(data.secure_url),
      publicId: data.public_id,
      width: data.width,
      height: data.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Optimize Cloudinary URLs with transformations for better performance
export const optimizeCloudinaryUrl = (url: string, options: {
  width?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif';
} = {}): string => {
  const { width = 800, quality = 80, format = 'auto' } = options;

  // Check if it's a Cloudinary URL
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  // Insert transformations after /upload/
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const transforms = `w_${width},q_${quality},f_${format},c_limit`;
  const beforeUpload = url.slice(0, uploadIndex + 8); // includes '/upload/'
  const afterUpload = url.slice(uploadIndex + 8);

  return `${beforeUpload}${transforms}/${afterUpload}`;
};

// Get thumbnail version of Cloudinary URL
export const getCloudinaryThumbnail = (url: string): string => {
  return optimizeCloudinaryUrl(url, { width: 200, quality: 60 });
};
