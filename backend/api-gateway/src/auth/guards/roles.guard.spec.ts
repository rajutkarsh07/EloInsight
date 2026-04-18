import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoles } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

type TestUser = { role?: string } | undefined;

/**
 * Build a minimal ExecutionContext whose request carries `user` and whose
 * reflector returns `requiredRoles`/`isPublic` from the decorator metadata.
 */
const buildContext = (options: {
  user: TestUser;
  requiredRoles?: string[];
  isPublic?: boolean;
}): { context: ExecutionContext; reflector: Reflector } => {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === IS_PUBLIC_KEY) return options.isPublic ?? false;
      if (key === ROLES_KEY) return options.requiredRoles;
      return undefined;
    }),
  } as unknown as Reflector;

  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ user: options.user }),
    }),
  } as unknown as ExecutionContext;

  return { context, reflector };
};

describe('RolesGuard', () => {
  it('allows the request when the handler is marked @Public()', () => {
    const { context, reflector } = buildContext({
      user: undefined,
      isPublic: true,
      requiredRoles: [UserRoles.ADMIN],
    });
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows the request when no roles are required', () => {
    const { context, reflector } = buildContext({
      user: { role: UserRoles.USER },
    });
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects when there is no authenticated user', () => {
    const { context, reflector } = buildContext({
      user: undefined,
      requiredRoles: [UserRoles.ADMIN],
    });
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects when the user lacks a role claim', () => {
    const { context, reflector } = buildContext({
      user: {},
      requiredRoles: [UserRoles.ADMIN],
    });
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects when the user role does not match', () => {
    const { context, reflector } = buildContext({
      user: { role: UserRoles.USER },
      requiredRoles: [UserRoles.ADMIN],
    });
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows the request when the user role matches the required role', () => {
    const { context, reflector } = buildContext({
      user: { role: UserRoles.ADMIN },
      requiredRoles: [UserRoles.ADMIN],
    });
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('does not leak which role is required in the error message', () => {
    const { context, reflector } = buildContext({
      user: { role: UserRoles.USER },
      requiredRoles: [UserRoles.ADMIN],
    });
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Insufficient permissions'),
    );
  });
});
