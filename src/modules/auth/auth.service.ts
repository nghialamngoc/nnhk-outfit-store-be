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
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../schemas/user.schema';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { UserService } from '../user/user.service';
import {
  AuthTokens,
  JwtPayload,
  AuthUserResponse,
  LoginProvider,
  LoginResponse,
} from 'src/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Store refresh tokens in memory (in production, use Redis)
  private refreshTokens: Map<string, { userId: string; expiresAt: Date }> =
    new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private async localLogin(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password } = loginDto;
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    if (!password) {
      throw new BadRequestException('Passord is required');
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
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
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
    try {
      const { refreshToken } = refreshTokenDto;

      // Check if refresh token exists and is valid
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
      const user = await this.userModel.findById(tokenData.userId);
      if (!user || !user.isActive) {
        this.refreshTokens.delete(refreshToken);
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new tokens
      const accessToken = await this.generateAccessToken(user);

      this.logger.log(`Tokens refreshed for user: ${user.email}`);

      return { accessToken };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`);
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    try {
      // Remove refresh token from storage
      const deleted = this.refreshTokens.delete(refreshToken);

      if (deleted) {
        this.logger.log('User logged out successfully');
        return { message: 'Logged out successfully' };
      } else {
        this.logger.warn('Logout attempted with invalid refresh token');
        return { message: 'Already logged out' };
      }
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
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRED'),
    });

    return accessToken;
  }

  private async generateRefreshToken(user: UserDocument): Promise<string> {
    const refreshTokenPayload = { sub: user.id };
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRED'),
    });

    // Store refresh token with expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 1 day from now

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
