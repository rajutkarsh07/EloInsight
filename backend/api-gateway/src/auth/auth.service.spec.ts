import { UnauthorizedException } from '@nestjs/common';

// Real bcrypt used to produce a valid hash for the "happy path" tests.
const realBcrypt = jest.requireActual<typeof import('bcrypt')>('bcrypt');

// Route the code under test through a mock so we can count invocations while
// still exercising real hashing behavior.
jest.mock('bcrypt', () => {
  const actual = jest.requireActual('bcrypt');
  return {
    ...actual,
    compare: jest.fn((password: string, hash: string) =>
      actual.compare(password, hash),
    ),
  };
});

// These imports MUST come after jest.mock so they pick up the mocked module.
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRoles } from './auth.types';

const ADMIN_PASSWORD = 'correct-horse-battery-staple';

describe('AuthService.authenticateAdmin', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let adminPasswordHash: string;
  const compareMock = bcrypt.compare as unknown as jest.Mock;

  beforeAll(async () => {
    adminPasswordHash = await realBcrypt.hash(ADMIN_PASSWORD, 4);
  });

  beforeEach(() => {
    compareMock.mockClear();
    prisma = { user: { findUnique: jest.fn() } };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };
    configService = { get: jest.fn().mockReturnValue('secret') };

    service = new AuthService(
      jwtService as any,
      configService as any,
      prisma as any,
    );
  });

  const buildAdmin = (
    overrides: Partial<{ role: string; passwordHash: string | null }> = {},
  ) => ({
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@example.com',
    username: 'admin',
    passwordHash:
      'passwordHash' in overrides ? overrides.passwordHash : adminPasswordHash,
    role: overrides.role ?? UserRoles.ADMIN,
    emailVerified: true,
    linkedAccounts: [],
  });

  it('issues tokens for a valid admin with the correct password', async () => {
    prisma.user.findUnique.mockResolvedValue(buildAdmin());

    const result = await service.authenticateAdmin('admin@example.com', ADMIN_PASSWORD);

    expect(result.tokens.accessToken).toBe('signed-token');
    expect(result.tokens.refreshToken).toBe('signed-token');
    expect(result.user.role).toBe(UserRoles.ADMIN);
    // JWT payload must carry the role so downstream guards work.
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRoles.ADMIN }),
      expect.any(Object),
    );
  });

  it('rejects a non-existent user with the same generic message', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.authenticateAdmin('nobody@example.com', ADMIN_PASSWORD),
    ).rejects.toThrow(new UnauthorizedException('Invalid admin credentials'));
  });

  it('rejects a user that has no password hash set', async () => {
    prisma.user.findUnique.mockResolvedValue(buildAdmin({ passwordHash: null }));

    await expect(
      service.authenticateAdmin('admin@example.com', ADMIN_PASSWORD),
    ).rejects.toThrow(new UnauthorizedException('Invalid admin credentials'));
  });

  it('rejects a non-admin account even with the correct password', async () => {
    prisma.user.findUnique.mockResolvedValue(buildAdmin({ role: UserRoles.USER }));

    await expect(
      service.authenticateAdmin('admin@example.com', ADMIN_PASSWORD),
    ).rejects.toThrow(new UnauthorizedException('Invalid admin credentials'));
  });

  it('rejects an admin with the wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(buildAdmin());

    await expect(
      service.authenticateAdmin('admin@example.com', 'wrong-password'),
    ).rejects.toThrow(new UnauthorizedException('Invalid admin credentials'));
  });

  it('always runs bcrypt.compare so failure paths cannot be distinguished by timing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.authenticateAdmin('nobody@example.com', ADMIN_PASSWORD),
    ).rejects.toThrow(UnauthorizedException);
    expect(compareMock).toHaveBeenCalledTimes(1);

    compareMock.mockClear();
    prisma.user.findUnique.mockResolvedValue(buildAdmin({ role: UserRoles.USER }));
    await expect(
      service.authenticateAdmin('user@example.com', ADMIN_PASSWORD),
    ).rejects.toThrow(UnauthorizedException);
    expect(compareMock).toHaveBeenCalledTimes(1);

    compareMock.mockClear();
    prisma.user.findUnique.mockResolvedValue(buildAdmin({ passwordHash: null }));
    await expect(
      service.authenticateAdmin('admin@example.com', ADMIN_PASSWORD),
    ).rejects.toThrow(UnauthorizedException);
    expect(compareMock).toHaveBeenCalledTimes(1);
  });
});
