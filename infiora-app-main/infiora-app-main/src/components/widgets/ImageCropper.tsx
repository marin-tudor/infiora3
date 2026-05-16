import React, { useCallback, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import Cropper from 'react-easy-crop';
import { compressImage, getCroppedImage } from '@/utils/imageUtils';

const ImageCropper = ({
  file,
  setFile,
  setCroppedImage,
  aspect = 1,
}: any) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const cropImage = useCallback(async () => {
    try {
      if (croppedAreaPixels) {
        const croppedImage = await getCroppedImage(
          file,
          croppedAreaPixels
        );

        if (croppedImage) {
          const compressedFile: any = await compressImage(
            croppedImage
          );

          setCroppedImage(compressedFile);
          setFile(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [file, setFile, croppedAreaPixels, setCroppedImage]);

  return (
    <Dialog
      open={file !== null}
      onClose={() => {
        setFile(null);
      }}
    >
      <DialogTitle>Crop Image</DialogTitle>
      <DialogContent>
        <div
          style={{
            position: 'relative',
            width: 250,
            height: 250,
            backgroundColor: '#ffffff',
          }}
        >
          <Cropper
            image={file}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={cropImage}>Crop</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageCropper;
