const MAX_FILE_SIZE = 400 * 1024;
const MAX_SOURCE_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const MIN_QUALITY = 0.4;
const QUALITIES = [0.8, 0.72, 0.64, 0.56, 0.48, MIN_QUALITY];
const DIMENSIONS = [MAX_DIMENSION, 1440, 1280, 1120, 960];
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface CompressedPropertyImage {
  file: File;
  originalSize: number;
  quality: number;
  transparencyFlattened: boolean;
}

const encodeCanvas = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> => (
  new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Browser gagal membuat file gambar.')),
        type,
        quality
      );
    } catch (error) {
      reject(new Error('Browser gagal mengompres gambar.', { cause: error }));
    }
  })
);

const containsTransparency = (context: CanvasRenderingContext2D, width: number, height: number): boolean => {
  const { data } = context.getImageData(0, 0, width, height);
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }
  return false;
};

const outputName = (name: string, extension: 'webp' | 'jpg'): string => (
  `${name.replace(/\.[^.]+$/, '')}.${extension}`
);

export const MAX_PROPERTY_IMAGE_SIZE = MAX_FILE_SIZE;

export const compressPropertyImage = async (file: File): Promise<CompressedPropertyImage> => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Pilih gambar JPG, PNG, atau WebP dengan format file yang valid.');
  }
  if (file.size > MAX_SOURCE_FILE_SIZE) {
    throw new Error('Ukuran foto asli maksimal 10 MB.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (error) {
    throw new Error('File gambar tidak dapat dibaca. Coba simpan ulang sebagai JPG, PNG, atau WebP.', {
      cause: error,
    });
  }

  try {
    const initialScale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const initialWidth = Math.max(1, Math.round(bitmap.width * initialScale));
    const initialHeight = Math.max(1, Math.round(bitmap.height * initialScale));
    const dimensionLevels = DIMENSIONS
      .filter(dimension => dimension < Math.max(initialWidth, initialHeight))
      .map(dimension => Math.min(1, dimension / Math.max(initialWidth, initialHeight)));
    const scales = [1, ...dimensionLevels];
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Browser tidak dapat memproses gambar.');

    const webpCanvas = document.createElement('canvas');
    const webpContext = webpCanvas.getContext('2d');
    if (!webpContext) throw new Error('Browser tidak dapat memproses gambar.');

    const codecs: Array<{ type: 'image/webp' | 'image/jpeg'; extension: 'webp' | 'jpg' }> = [
      { type: 'image/webp', extension: 'webp' },
      { type: 'image/jpeg', extension: 'jpg' },
    ];
    let jpegEncodingFailure: unknown;

    for (const codec of codecs) {
      let codecFailed = false;
      for (const scale of scales) {
        const width = Math.max(1, Math.round(initialWidth * scale));
        const height = Math.max(1, Math.round(initialHeight * scale));
        canvas.width = width;
        canvas.height = height;
        webpCanvas.width = width;
        webpCanvas.height = height;

        const drawContext = codec.type === 'image/webp' ? webpContext : context;
        drawContext.clearRect(0, 0, width, height);
        let transparencyFlattened = false;
        if (codec.type === 'image/jpeg') {
          webpCanvas.width = width;
          webpCanvas.height = height;
          webpContext.clearRect(0, 0, width, height);
          webpContext.drawImage(bitmap, 0, 0, width, height);
          transparencyFlattened = containsTransparency(webpContext, width, height);
          drawContext.fillStyle = '#FFFFFF';
          drawContext.fillRect(0, 0, width, height);
        }
        drawContext.drawImage(bitmap, 0, 0, width, height);

        for (const quality of QUALITIES) {
          let blob: Blob;
          try {
            blob = await encodeCanvas(drawContext.canvas, codec.type, quality);
          } catch (error) {
            if (codec.type === 'image/jpeg') jpegEncodingFailure = error;
            codecFailed = true;
            break;
          }

          if (blob.type !== codec.type) {
            if (codec.type === 'image/jpeg') {
              jpegEncodingFailure = new Error('Browser tidak menghasilkan JPEG yang valid.');
            }
            codecFailed = true;
            break;
          }
          if (blob.size > MAX_FILE_SIZE) continue;

          return {
            file: new File([blob], outputName(file.name, codec.extension), {
              type: codec.type,
              lastModified: Date.now(),
            }),
            originalSize: file.size,
            quality,
            transparencyFlattened,
          };
        }
        if (codecFailed) break;
      }
    }

    if (jpegEncodingFailure) {
      throw new Error('Browser gagal membuat file gambar terkompresi. Coba browser lain atau gambar berbeda.', {
        cause: jpegEncodingFailure,
      });
    }
    throw new Error(
      'Ukuran gambar masih melebihi 400 KB setelah kompresi. Silakan gunakan gambar lain atau kurangi resolusinya.'
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('400 KB')) throw error;
    throw new Error(
      error instanceof Error ? error.message : 'Browser gagal mengompres gambar.',
      { cause: error }
    );
  } finally {
    bitmap.close();
  }
};

export const formatImageSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
