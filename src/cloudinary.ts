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
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};
