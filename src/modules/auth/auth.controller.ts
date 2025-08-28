import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { Response } from 'express';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(loginDto, response);
  }

  @Public()
  @Post('/refresh-token')
  async reFreshToken(
    @Body() { refreshToken }: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.refreshToken(refreshToken, response);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return { user };
  }
}
