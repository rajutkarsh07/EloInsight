import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserRoles } from '../auth.types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

export function AdminOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRoles.ADMIN),
  );
}
