import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by {@link AdminOnly}/guards to skip authentication and
 * authorization for individual handlers inside an otherwise-protected
 * controller.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route handler as publicly accessible. When a controller is protected
 * via class-level `@AdminOnly()`, applying `@Public()` to a single handler
 * bypasses both the JWT guard and the roles guard for that endpoint.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
