import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'User email address',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        example: 'password123',
        description: 'User password',
        minLength: 6,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}

export class RegisterDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'User email address',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        example: 'johndoe',
        description: 'Username (alphanumeric, 3-20 characters)',
        minLength: 3,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @Matches(/^[a-zA-Z0-9_]+$/, {
        message: 'Username can only contain letters, numbers, and underscores',
    })
    username: string;

    @ApiProperty({
        example: 'Password123!',
        description: 'User password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)',
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'Password must contain at least 1 uppercase, 1 lowercase, and 1 number',
    })
    password: string;
}

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
        isVerified: boolean;
    };

    @ApiProperty()
    tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
}

export class RegisterResponseDto {
    @ApiProperty()
    message: string;

    @ApiProperty()
    user: {
        id: string;
        email: string;
        username: string;
        isVerified: boolean;
    };
}

export class VerifyResponseDto {
    @ApiProperty()
    message: string;

    @ApiProperty()
    verified: boolean;
}
