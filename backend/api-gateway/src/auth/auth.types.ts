export const UserRoles = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];
