import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

interface RequestUser {
  id: string;
  phone: string;
  roles: string[];
  roleAssignments?: string[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: RequestUser }>();

    const userRoles =
      request.user?.roles ?? request.user?.roleAssignments ?? [];

    const hasRole = roles.some((role) => userRoles.includes(role));

    return hasRole;
  }
}
