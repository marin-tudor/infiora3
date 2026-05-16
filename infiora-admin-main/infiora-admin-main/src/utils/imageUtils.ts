import Compressor from 'compressorjs';
import { toPng } from 'html-to-image';
import { toast } from 'react-toastify';
import axios from 'axios';
import { env } from '@/configs/env';

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getRadianAngle = (degreeValue: number): number =>
  (degreeValue * Math.PI) / 180;

const rotateSize = (
  width: number,
  height: number,
  rotation: number
) => {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) +
      Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) +
      Math.abs(Math.cos(rotRad) * height),
  };
};

export const getCroppedImage = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip: { horizontal: boolean; vertical: boolean } = {
    horizontal: false,
    vertical: false,
  }
): Promise<File | null> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Set the background to transparent
  ctx.globalAlpha = 0;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(data, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${Date.now()}.png`, {
          type: 'image/png',
        });

        resolve(file);
      } else {
        reject(new Error('Failed to create blob.'));
      }
    }, 'image/png');
  });
};

/**
 * Compresses the given image.
 * @param {File} image - The image to be compressed.
 * @returns {Promise<File>} A promise that resolves to the compressed image file.
 */
export const compressImage = (image: File) => {
  return new Promise((resolve, reject) => {
    new Compressor(image, {
      quality: 0.6,
      success(result) {
        const compressedFile = new File([result], image.name, {
          type: image.type,
          lastModified: image.lastModified,
        });

        resolve(compressedFile);
      },
      error(error) {
        console.error(error.message);
        reject(error);
      },
    });
  });
};

export const downloadFile = async (
  url?: string
): Promise<File | undefined> => {
  if (!url) {
    console.error('Download URL is undefined.');

    return undefined;
  }

  try {
    // Extract the file path after "/uploads/"
    const [, filePath] = url.split('/uploads/');

    if (!filePath) {
      throw new Error(
        'Invalid URL structure. Could not extract file path.'
      );
    }

    const apiUrl = `${env.NEXT_PUBLIC_API_URL}/v1/uploads/${filePath}`;

    // Make an HTTP GET request with responseType set to 'blob'
    const response = await axios.get(apiUrl, {
      responseType: 'blob',
      withCredentials: true,
    });

    // Extract Blob and file properties
    const blob = response.data;
    const fileName = url.split('/').pop() || 'file';
    const fileType = blob.type || 'application/octet-stream';

    // Create a File object
    return new File([blob], fileName, { type: fileType });
  } catch (error) {
    console.error(`Error downloading file from URL: ${url}`, error);

    return undefined;
  }
};

export const uploadFile = async (
  file?: File
): Promise<string | undefined> => {
  if (!file) {
    console.error('No file provided for upload.');

    return undefined;
  }

  try {
    const formData = new FormData();

    formData.append('file', file);

    // Make an HTTP POST request with Axios
    const response = await axios.post(
      `${env.NEXT_PUBLIC_API_URL}/v1/uploads`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true, // Include cookies with the request
      }
    );

    // Assume the response contains the file's URL as plain text
    const imageUrl = response.data;

    if (!imageUrl) {
      throw new Error('No URL returned from the server.');
    }

    return imageUrl;
  } catch (error) {
    console.error('Error uploading file:', error);

    return undefined;
  }
};

export const downloadNodeAsImage = async (
  node: any,
  options = { quality: 0.95, canvasWidth: 250, canvasHeight: 250 },
  fileName = 'image.png'
) => {
  if (!node) {
    console.error('No valid DOM node provided for image download.');
    toast.error('Failed to download image');

    return;
  }

  try {
    const dataUrl = await toPng(node, {
      quality: options.quality,
      canvasWidth: options.canvasWidth,
      canvasHeight: options.canvasHeight,
    });

    const link = document.createElement('a');

    link.download = fileName;
    link.href = dataUrl;
    link.click();
    toast.success('Download Success');
  } catch (error) {
    console.error('Failed to download image:', error);
    toast.error('Failed to download image');
  }
};

export const readFileAsDataURL = (
  file?: File
): Promise<string | undefined> => {
  if (!file) {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      resolve(
        typeof reader.result === 'string' ? reader.result : undefined
      );
    };

    reader.onerror = () => {
      resolve(undefined);
    };

    reader.readAsDataURL(file);
  });
};

export const nodeToFile = async (
  node: any,
  fileName = 'image.png',
  fileType = 'image/png'
) => {
  if (node) {
    try {
      const dataUrl = await toPng(node);
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      return new File([blob], fileName, { type: fileType });
    } catch (error) {
      console.error('Error creating file from node:', error);
    }
  }
};
