import Compressor from 'compressorjs';

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
