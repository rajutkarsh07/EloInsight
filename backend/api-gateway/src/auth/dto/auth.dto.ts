import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../auth.types';

export class AuthResponseDto {
    @ApiProperty()
    user: {
        id: string;
        email: string;
        username: string;
        role: UserRole;
        isVerified: boolean;
    };

    @ApiProperty()
    tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
}
