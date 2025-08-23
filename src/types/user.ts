import { LoginProvider } from './auth';

export enum UserRole {
  user = 'user',
  admin = 'admin',
}

export interface User {
  id: string;
  email?: string;
  name?: string;
  password?: string;
  provider?: LoginProvider;
  providerId?: string;
  role?: string;
  isActive?: boolean;
}
