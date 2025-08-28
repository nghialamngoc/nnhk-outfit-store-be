import { User } from './user';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface LoginResponse {
  user: User;
  message: string;
}

export enum LoginProvider {
  local = 'local',
  facebook = 'facebook',
  google = 'google',
}
