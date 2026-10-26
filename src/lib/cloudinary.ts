import { supabase } from './supabase';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

const prepareImage = async (file: File): Promise<File> => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Pilih gambar JPG, PNG, atau WebP.');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Ukuran foto maksimal 10 MB.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (error) {
    throw new Error('File gambar tidak dapat dibaca. Coba simpan ulang sebagai JPG, PNG, atau WebP.', { cause: error });
  }

  try {
    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser tidak dapat memproses foto.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Gagal mengoptimalkan foto.')),
        'image/webp',
        0.82
      );
    });

    if (optimizedBlob.size >= file.size) return file;
    return new File([optimizedBlob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
};

export const uploadPropertyImage = async (file: File): Promise<string> => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi untuk upload foto.');
  const optimizedFile = await prepareImage(file);

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

  return result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
};
