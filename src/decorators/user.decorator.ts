import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserResponse } from 'src/types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUserResponse = request.user;

    return data ? user?.[data as keyof AuthUserResponse] : user;
  },
);
