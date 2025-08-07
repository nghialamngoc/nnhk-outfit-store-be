import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

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

  /**
   * Upload single image from base64
   */
  async uploadImageFromBase64(
    base64String: string,
    folder: string = 'products',
  ): Promise<string> {
    try {
      // Extract mime type and data from base64
      const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string format');
      }

      const mimeType = matches[1];
      const data = matches[2];

      // Validate image mime type
      if (!mimeType.startsWith('image/')) {
        throw new Error('File is not an image');
      }

      // Get file extension from mime type
      const extension = mimeType.split('/')[1];
      const fileName = `${folder}/${uuidv4()}.${extension}`;

      // Convert base64 to buffer
      const buffer = Buffer.from(data, 'base64');

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
      this.logger.log(`Uploaded image: ${imageUrl}`);

      return imageUrl;
    } catch (error) {
      this.logger.error(`Failed to upload image: ${error.message}`);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple images from base64 array
   */
  async uploadMultipleImagesFromBase64(
    base64Images: string[],
    folder: string = 'products',
  ): Promise<string[]> {
    if (!base64Images || base64Images.length === 0) {
      return [];
    }

    const uploadPromises = base64Images.map((base64) =>
      this.uploadImageFromBase64(base64, folder),
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      this.logger.error(`Failed to upload multiple images: ${error.message}`);
      throw new Error(`Multiple image upload failed: ${error.message}`);
    }
  }

  /**
   * Delete image by URL
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract key from URL
      const key = this.extractKeyFromUrl(imageUrl);
      if (!key) {
        this.logger.warn(`Invalid image URL format: ${imageUrl}`);
        return;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted image: ${imageUrl}`);
    } catch (error) {
      this.logger.error(`Failed to delete image ${imageUrl}: ${error.message}`);
      // Don't throw error for delete operations to prevent blocking other operations
    }
  }

  /**
   * Delete multiple images by URLs
   */
  async deleteMultipleImages(imageUrls: string[]): Promise<void> {
    if (!imageUrls || imageUrls.length === 0) {
      return;
    }

    const deletePromises = imageUrls.map((url) => this.deleteImage(url));
    await Promise.allSettled(deletePromises); // Use allSettled to continue even if some fail
  }

  /**
   * Replace old images with new ones
   */
  async replaceImages(
    oldImageUrls: string[] = [],
    newBase64Images: string[] = [],
    folder: string = 'products',
  ): Promise<string[]> {
    try {
      // Upload new images first
      const newImageUrls = await this.uploadMultipleImagesFromBase64(
        newBase64Images,
        folder,
      );

      // Delete old images (don't await to not block the response)
      if (oldImageUrls.length > 0) {
        this.deleteMultipleImages(oldImageUrls).catch((error) => {
          this.logger.error(`Failed to delete old images: ${error.message}`);
        });
      }

      return newImageUrls;
    } catch (error) {
      this.logger.error(`Failed to replace images: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract S3 key from public URL
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    } catch {
      return null;
    }
  }
}
