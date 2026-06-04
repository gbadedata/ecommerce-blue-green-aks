import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthenticatedUser } from 'src/types/service';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (data) {
      const value = user[data];

      if (value === undefined) {
        throw new UnauthorizedException(
          `Authenticated user does not contain property "${String(data)}"`,
        );
      }

      return value;
    }

    return user;
  },
);
