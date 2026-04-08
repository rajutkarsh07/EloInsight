import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
    @ApiProperty({
        example: 'abc123-verification-token',
        description: 'Email verification token',
    })
    @IsString()
    @IsNotEmpty()
    token: string;
}

export class ResendVerificationDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'User email address',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}

export class AuthResponseDto {
    @ApiProperty()
    user: {
        id: string;
        email: string;
        username: string;
        role?: string;
        isVerified: boolean;
    };

    @ApiProperty()
    tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
}

export class VerifyResponseDto {
    @ApiProperty()
    message: string;

    @ApiProperty()
    verified: boolean;
}
