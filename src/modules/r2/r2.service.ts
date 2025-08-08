import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';
import * as path from 'path';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID')!;
    const accessKey = this.configService.get<string>('R2_ACCESS_KEY')!;
    const secretKey = this.configService.get<string>('R2_SECRET_KEY')!;

    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME')!;
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL')!;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
  }

  private async optimizeImage(
    buffer: Buffer,
  ): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
    try {
      const optimizedImage = await sharp(buffer)
        .resize({ width: 1280, withoutEnlargement: true }) // Max width 1280px, keep aspect ratio
        .webp({ quality: 100 }) // Convert to WebP, quality
        .toBuffer();

      return {
        buffer: optimizedImage,
        mimeType: 'image/webp',
        extension: 'webp',
      };
    } catch (error) {
      this.logger.error(`Failed to optimize image: ${error.message}`);
      throw new Error(`Image optimization failed: ${error.message}`);
    }
  }

  private async generateUniqueFileName(
    fileName: string,
    folder: string,
  ): Promise<string> {
    const baseName = path.basename(fileName, path.extname(fileName));
    const extension = path.extname(fileName).slice(1) || 'webp';
    const maxTime = 9999999999999;
    const supportOrderOnly = (maxTime - Date.now()).toString();
    const uniqueName = `${folder}/[${supportOrderOnly}]-${baseName}.${extension}`;

    return uniqueName;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'products',
  ): Promise<string> {
    try {
      // Validate file type
      if (!file.mimetype.startsWith('image/')) {
        throw new Error('File is not an image');
      }

      const { buffer, mimeType } = await this.optimizeImage(file.buffer);

      const fileName = await this.generateUniqueFileName(
        file.originalname,
        folder,
      );

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'max-age=31536000', // 1 year cache
      });

      await this.s3Client.send(command);

      const imageUrl = `${this.publicUrl}/${fileName}`;
      this.logger.log(`Uploaded file: ${imageUrl}`);

      return imageUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'products',
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map((file) => this.uploadFile(file, folder));

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      this.logger.error(`Failed to upload multiple files: ${error.message}`);
      throw new Error(`Multiple file upload failed: ${error.message}`);
    }
  }

  async listImages(
    limit: number = 10,
    continuationToken?: string,
    search?: string,
  ): Promise<{
    images: string[];
    count: number;
    nextContinuationToken: string | null;
  }> {
    this.logger.log(
      `r2 get list images with params ${JSON.stringify({ limit, continuationToken, search })}`,
    );

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: `products/${search || ''}`,
        MaxKeys: Math.min(limit, 1000), // R2 limit: max 1000
        ContinuationToken: continuationToken,
      });

      const { Contents, NextContinuationToken } =
        await this.s3Client.send(command);

      let images = (Contents || [])
        .filter((obj) => obj.Key && obj.Key.endsWith('.webp')) // Only include WebP images
        .map((obj) => `${this.publicUrl}/${obj.Key}`);

      return {
        images,
        count: images.length,
        nextContinuationToken: NextContinuationToken || null,
      };
    } catch (error) {
      this.logger.error(`Failed to list images: ${error.message}`);
      throw new Error(`Failed to list images: ${error.message}`);
    }
  }
}
