import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { LoginProvider } from 'src/types';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  loginProvider?: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class GetProfileServerDto {
  @IsString()
  accessToken?: string;

  @IsString()
  refreshToken?: string;
}
