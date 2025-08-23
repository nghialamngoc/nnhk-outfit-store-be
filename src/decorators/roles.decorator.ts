import { SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Injectable, CanActivate } from '@nestjs/common';
import { AuthUserResponse } from 'src/types';

export const ROLES_KEY = 'role';
export const UseRole = (role: string) => SetMetadata(ROLES_KEY, role);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUserResponse = request.user;

    if (user.role?.includes('admin')) {
      return true;
    }

    if (!user || !user.role || !user.role.includes(requiredRoles)) {
      throw new UnauthorizedException(
        `User does not have the required role: ${requiredRoles}`,
      );
    }

    return true;
  }
}
