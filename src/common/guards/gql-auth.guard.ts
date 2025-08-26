import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    if (!request) {
      throw new UnauthorizedException('Request not found in GraphQL context');
    }

    if (!request.logIn) {
      request.logIn = (user: any, callback?: (err: any) => void) => {
        request.user = user;
        if (callback) callback(null);
      };
    }

    if (!request.logOut) {
      request.logOut = (callback?: (err: any) => void) => {
        request.user = null;
        if (callback) callback(null);
      };
    }

    if (!request.isAuthenticated) {
      request.isAuthenticated = () => !!request.user;
    }

    if (!request.isUnauthenticated) {
      request.isUnauthenticated = () => !request.user;
    }

    return request;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return user || null; // Cho phép null user với public endpoints
    }

    if (err || !user) {
      console.log('Authentication failed:', { err, user, info }); // Debug log
      throw err || new UnauthorizedException('User not authenticated');
    }

    return user;
  }
}
