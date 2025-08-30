import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../schemas/user.schema';
import { GetProfileServerDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { UserService } from '../user/user.service';
import {
  JwtPayload,
  AuthUserResponse,
  LoginProvider,
  LoginResponse,
  RefreshTokenResponse,
} from 'src/types';
import { parseExpiresInToMs } from 'src/utils/time';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtAccessSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtAccessExpired: string;
  private readonly jwtRefreshExpired: string;

  // Store refresh tokens in memory (in production, use Redis)
  private refreshTokens: Map<string, { userId: string; expiresAt: Date }> =
    new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.jwtAccessSecret = this.configService.get<string>('JWT_ACCESS_SECRET')!;
    this.jwtRefreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET')!;
    this.jwtAccessExpired =
      this.configService.get<string>('JWT_ACCESS_EXPIRED')!;
    this.jwtRefreshExpired = this.configService.get<string>(
      'JWT_REFRESH_EXPIRED',
    )!;
  }

  async getProfileServer({
    accessToken,
    refreshToken,
  }: GetProfileServerDto): Promise<{
    user?: AuthUserResponse;
    accessToken?: string;
    refreshToken?: string;
  }> {
    try {
      let user: AuthUserResponse | null = null;
      let newAccessToken = accessToken;

      // Step 1: Try to verify accessToken if provided
      if (accessToken) {
        try {
          const payload = await this.jwtService.verifyAsync<JwtPayload>(
            accessToken,
            {
              secret: this.jwtAccessSecret,
            },
          );
          user = await this.validateUser(payload);
          if (!user) {
            throw new UnauthorizedException('User not found or inactive');
          }
          this.logger.log(
            `Profile retrieved with valid accessToken: ${user.email}`,
          );
          return { user, accessToken, refreshToken };
        } catch (error) {
          this.logger.warn(`Access token invalid or expired: ${error.message}`);
          // Access token invalid, proceed to refresh token
        }
      }

      // Step 2: If accessToken is invalid or not provided, check refreshToken
      if (!refreshToken) {
        throw new UnauthorizedException('No refresh token provided');
      }

      const tokenData = this.refreshTokens.get(refreshToken);
      if (!tokenData) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if refresh token is expired
      if (new Date() > tokenData.expiresAt) {
        this.refreshTokens.delete(refreshToken);
        throw new UnauthorizedException('Refresh token expired');
      }

      // Find user
      const userDoc = await this.userModel.findById(tokenData.userId);
      if (!userDoc || !userDoc.isActive) {
        this.refreshTokens.delete(refreshToken);
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token
      newAccessToken = await this.generateAccessToken(userDoc);

      user = {
        id: userDoc.id,
        email: userDoc.email,
        name: userDoc.name,
        role: userDoc.role,
      };

      this.logger.log(`Profile retrieved with new accessToken: ${user.email}`);

      return {
        user,
        accessToken: newAccessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(`Get profile failed: ${error.message}`);
      throw error;
    }
  }

  private async localLogin(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password } = loginDto;
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    if (!password) {
      throw new BadRequestException('Password is required');
    }

    // Find user by email
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password!);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    this.logger.log(`User logged in successfully: ${email}`);

    return {
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      message: 'Login successful',
      success: true,
    };
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    try {
      const { loginProvider } = loginDto;

      if (loginProvider === LoginProvider.local) {
        return await this.localLogin(loginDto);
      }

      throw new UnauthorizedException('Something wrong. Please try later!');
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`);
      throw error;
    }
  }

  async refreshToken(
    refreshTokenFromCookie: string,
  ): Promise<RefreshTokenResponse> {
    try {
      // Check if refresh token exists and is valid
      const tokenData = this.refreshTokens.get(refreshTokenFromCookie);
      if (!tokenData) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if refresh token is expired
      if (new Date() > tokenData.expiresAt) {
        this.refreshTokens.delete(refreshTokenFromCookie);
        throw new UnauthorizedException('Refresh token expired');
      }

      // Find user
      const user = await this.userModel.findById(tokenData.userId);
      if (!user || !user.isActive) {
        this.refreshTokens.delete(refreshTokenFromCookie);
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token
      const newAccessToken = await this.generateAccessToken(user);

      this.logger.log(`Token refreshed for user: ${user.email}`);

      return {
        message: 'Token refreshed successfully',
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`);
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    try {
      // Remove refresh token from storage
      this.refreshTokens.delete(refreshToken);

      this.logger.log('User logged out successfully');
      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`);
      throw new BadRequestException('Logout failed');
    }
  }

  async validateUser(payload: JwtPayload): Promise<AuthUserResponse | null> {
    try {
      const user = await this.userModel.findById(payload.sub);

      if (!user || !user.isActive) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch (error) {
      this.logger.error(`User validation failed: ${error.message}`);
      return null;
    }
  }

  private async generateAccessToken(user: UserDocument): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtAccessSecret,
      expiresIn: this.jwtAccessExpired,
    });

    return accessToken;
  }

  private async generateRefreshToken(user: UserDocument): Promise<string> {
    const refreshTokenPayload = { sub: user.id };
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.jwtRefreshExpired,
    });

    // Store refresh token with expiration
    const expiresInMs = parseExpiresInToMs(this.jwtRefreshExpired);
    const expiresAt = new Date(Date.now() + expiresInMs);

    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt,
    });

    return refreshToken;
  }

  // Clean up expired refresh tokens (run this periodically)
  cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.refreshTokens.entries()) {
      if (now > data.expiresAt) {
        this.refreshTokens.delete(token);
      }
    }
    this.logger.log('Cleaned up expired refresh tokens');
  }
}
