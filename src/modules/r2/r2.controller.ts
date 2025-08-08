import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { R2Service } from '../r2/r2.service';

@Controller('upload')
export class R2UploadController {
  constructor(private readonly r2Service: R2Service) {}

  @Post('images')
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 files
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const imageUrls = await this.r2Service.uploadMultipleFiles(files);

    return {
      success: true,
      imageUrls,
      count: imageUrls.length,
      message: 'Images uploaded successfully',
    };
  }

  @Get('images')
  async listImages(
    @Query('limit') limit: string = '10',
    @Query('continuationToken') continuationToken?: string,
    @Query('search') search?: string,
  ) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      throw new BadRequestException(
        'Limit must be a number between 1 and 1000',
      );
    }

    try {
      const { images, count, nextContinuationToken } =
        await this.r2Service.listImages(parsedLimit, continuationToken, search);

      return {
        success: true,
        images,
        count,
        nextContinuationToken,
        message: 'Images retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
