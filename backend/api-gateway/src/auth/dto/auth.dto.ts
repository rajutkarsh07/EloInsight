import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
    @ApiProperty()
    user: {
        id: string;
        email: string;
        username: string;
        isVerified: boolean;
    };

    @ApiProperty()
    tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
}
