import { supabase } from './supabase';
import {
  compressPropertyImage,
  CompressedPropertyImage,
  MAX_PROPERTY_IMAGE_SIZE,
} from './compressPropertyImage';

export type PropertyImageUploadProgress =
  | { stage: 'compressing' }
  | { stage: 'uploading'; compression: CompressedPropertyImage };

interface CloudinaryUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  uploadPreset: string;
  signature: string;
}

interface CloudinaryUploadResponse {
  secure_url?: unknown;
  bytes?: unknown;
  error?: { message?: unknown };
}

const isUploadSignature = (value: unknown): value is CloudinaryUploadSignature => {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  return typeof data.cloudName === 'string'
    && typeof data.apiKey === 'string'
    && typeof data.timestamp === 'number'
    && typeof data.folder === 'string'
    && typeof data.publicId === 'string'
    && typeof data.uploadPreset === 'string'
    && typeof data.signature === 'string';
};

export const uploadPropertyImage = async (
  file: File,
  onProgress?: (progress: PropertyImageUploadProgress) => void
): Promise<string> => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi untuk upload foto.');
  onProgress?.({ stage: 'compressing' });
  const compression = await compressPropertyImage(file);
  if (
    compression.file.size > MAX_PROPERTY_IMAGE_SIZE
    || compression.file.type !== 'image/webp' && compression.file.type !== 'image/jpeg'
  ) {
    throw new Error('Gambar hasil kompresi tidak memenuhi batas ukuran atau format yang diizinkan.');
  }
  const optimizedFile = compression.file;
  onProgress?.({ stage: 'uploading', compression });

  const { data: signatureData, error: signatureError } = await supabase.functions.invoke(
    'cloudinary-upload-signature',
    { body: {} }
  );
  if (signatureError) {
    throw new Error('Gagal memperoleh izin upload foto. Pastikan fungsi Cloudinary sudah dikonfigurasi.', {
      cause: signatureError,
    });
  }
  if (!isUploadSignature(signatureData)) {
    throw new Error('Respons izin upload foto dari server tidak valid.');
  }

  const formData = new FormData();
  formData.append('file', optimizedFile);
  formData.append('api_key', signatureData.apiKey);
  formData.append('timestamp', String(signatureData.timestamp));
  formData.append('folder', signatureData.folder);
  formData.append('public_id', signatureData.publicId);
  formData.append('upload_preset', signatureData.uploadPreset);
  formData.append('signature', signatureData.signature);

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(signatureData.cloudName)}/image/upload`,
      { method: 'POST', body: formData }
    );
  } catch (error) {
    throw new Error('Tidak dapat terhubung ke layanan upload gambar.', { cause: error });
  }

  let result: CloudinaryUploadResponse;
  try {
    result = await response.json() as CloudinaryUploadResponse;
  } catch (error) {
    throw new Error('Layanan gambar mengembalikan respons yang tidak dapat dibaca.', { cause: error });
  }
  if (!response.ok) {
    const message = typeof result.error?.message === 'string'
      ? result.error.message
      : 'Cloudinary menolak upload foto.';
    throw new Error(message);
  }
  if (typeof result.secure_url !== 'string' || !result.secure_url.startsWith('https://')) {
    throw new Error('Cloudinary tidak mengembalikan URL foto HTTPS yang valid.');
  }
  if (typeof result.bytes === 'number' && result.bytes > MAX_PROPERTY_IMAGE_SIZE) {
    throw new Error('Cloudinary menerima gambar di atas batas 400 KB. Periksa batas ukuran Upload Preset.');
  }

  return result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
};
