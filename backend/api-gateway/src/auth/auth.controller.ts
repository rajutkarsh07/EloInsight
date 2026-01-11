import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
    LoginDto,
    RegisterDto,
    VerifyEmailDto,
    ResendVerificationDto,
    AuthResponseDto,
    RegisterResponseDto,
    VerifyResponseDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({
        status: 201,
        description: 'User registered. Verification email sent.',
        type: RegisterResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Email/username already exists or validation failed' })
    async register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
        return this.authService.register(registerDto);
    }

    @Get('verify-email')
    @ApiOperation({ summary: 'Verify email address' })
    @ApiQuery({ name: 'token', description: 'Verification token from email' })
    @ApiResponse({
        status: 200,
        description: 'Email verified successfully',
        type: VerifyResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async verifyEmail(@Query('token') token: string): Promise<VerifyResponseDto> {
        return this.authService.verifyEmail(token);
    }

    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify email address (POST alternative)' })
    @ApiResponse({
        status: 200,
        description: 'Email verified successfully',
        type: VerifyResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async verifyEmailPost(@Body() verifyDto: VerifyEmailDto): Promise<VerifyResponseDto> {
        return this.authService.verifyEmail(verifyDto.token);
    }

    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Resend verification email' })
    @ApiResponse({
        status: 200,
        description: 'Verification email sent (if email exists)',
    })
    async resendVerification(@Body() resendDto: ResendVerificationDto) {
        return this.authService.resendVerification(resendDto.email);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({
        status: 200,
        description: 'Successfully logged in',
        type: AuthResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Invalid credentials or email not verified' })
    async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
        return this.authService.login(loginDto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({
        status: 200,
        description: 'Token refreshed successfully',
        type: AuthResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refresh(@Body('refreshToken') refreshToken: string): Promise<AuthResponseDto> {
        return this.authService.refreshToken(refreshToken);
    }
}
