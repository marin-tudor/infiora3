import fs from 'fs';
import AWS, { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { PromiseResult } from 'aws-sdk/lib/request';
import config from '../../config/config';
import { logger } from '../logger';

AWS.config.update({
  accessKeyId: config.aws.accessKey,
  secretAccessKey: config.aws.secretKey,
  region: config.aws.region,
});

const s3 = new AWS.S3();

const uploadLocally = async (file: Express.Multer.File, type: string): Promise<string> => {
  const safeType = type
    .split(/[\\/]+/)
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, '-'))
    .join('/');
  const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
  const uploadDir = path.join(process.cwd(), 'uploads', 'dev', safeType);
  const targetPath = path.join(uploadDir, fileName);

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await fs.promises.mkdir(uploadDir, { recursive: true });
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.promises.rename(file.path, targetPath);
  } catch (error: any) {
    if (error?.code !== 'EXDEV') throw error;
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.promises.copyFile(file.path, targetPath);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.promises.unlink(file.path);
  }

  return `/v1/uploads/dev/${safeType}/${fileName}`;
};

// Uploads a file to S3
export const uploadToS3 = async (file: Express.Multer.File, type: string): Promise<string> => {
  if (config.env !== 'production') {
    return uploadLocally(file, type);
  }

  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const fileStream = fs.createReadStream(file.path);
    const Key = `uploads${config.env === 'production' ? '' : '/dev'}/${type}/${uuidv4()}${path.extname(file.originalname)}`;

    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: config.aws.bucketName,
      Body: fileStream,
      Key,
      ContentType: file.mimetype,
    };

    const { Location } = await s3.upload(uploadParams).promise();

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.unlink(file.path, (err) => {
      if (err) {
        logger.error(`Error deleting temporary file: ${file.path}`, err);
      }
    });

    return Location;
  } catch (error) {
    logger.error('Error uploading file to S3:', error);
    throw new Error('File upload failed');
  }
};

// Downloads a file from S3
export const getFromS3 = async (key: string): Promise<PromiseResult<S3.GetObjectOutput, AWS.AWSError>> => {
  try {
    const downloadParams = {
      Key: key,
      Bucket: config.aws.bucketName,
    };
    return await s3.getObject(downloadParams).promise();
  } catch (error) {
    logger.error('Error downloading file from S3:', error);
    throw new Error('File download failed');
  }
};
