import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Typography,
} from '@mui/material';
import React, { ChangeEvent, useState } from 'react';
import ImageCropper from './ImageCropper';

const ImagePicker = ({
  id,
  label,
  image,
  setImage,
  placeholder,
}: any) => {
  const [file, setFile] = useState<any>(null);

  const handleInputImageChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      try {
        setFile(URL.createObjectURL(selectedFile));
      } catch (error) {
        console.error('Error compressing image:', error);
      }
    }
  };

  const handleImageClick = () => {
    const inputElement = document.getElementById(
      id
    ) as HTMLInputElement;
    inputElement.click();
  };

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Avatar
            src={image || placeholder}
            sx={{
              height: 80,
              mb: 2,
              width: 80,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
      <Divider />
      <CardActions>
        <Button fullWidth variant="text" onClick={handleImageClick}>
          Upload picture
        </Button>
      </CardActions>
      <input
        hidden
        type="file"
        accept="image/png, image/jpeg"
        onChange={handleInputImageChange}
        id={id}
      />
      <ImageCropper
        file={file}
        setFile={setFile}
        setCroppedImage={setImage}
      />
    </Card>
  );
};

export default ImagePicker;
