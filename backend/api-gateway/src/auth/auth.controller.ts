import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
    ) { }

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

    // ============ Lichess OAuth Endpoints ============

    @Get('lichess')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Initiate Lichess OAuth flow' })
    @ApiResponse({ status: 302, description: 'Redirects to Lichess OAuth page' })
    async lichessAuth(@Req() req: Request, @Res() res: Response) {
        const user = req.user as { id: string };
        const { url } = this.authService.getLichessAuthUrl(user.id);
        res.redirect(url);
    }

    @Get('lichess/url')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get Lichess OAuth URL (for SPA)' })
    @ApiResponse({ status: 200, description: 'Returns the OAuth URL' })
    async getLichessAuthUrl(@Req() req: Request) {
        const user = req.user as { id: string };
        const { url, state } = this.authService.getLichessAuthUrl(user.id);
        return { url, state };
    }

    @Get('lichess/callback')
    @ApiOperation({ summary: 'Handle Lichess OAuth callback' })
    @ApiQuery({ name: 'code', description: 'Authorization code from Lichess' })
    @ApiQuery({ name: 'state', description: 'State parameter for CSRF protection' })
    @ApiResponse({ status: 302, description: 'Redirects to settings page on success' })
    async lichessCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response,
    ) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
        
        try {
            const { username } = await this.authService.handleLichessCallback(code, state);
            // Redirect to settings with success message
            res.redirect(`${frontendUrl}/settings?lichess=connected&username=${encodeURIComponent(username)}`);
        } catch (error) {
            // Redirect to settings with error message
            const errorMessage = error instanceof Error ? error.message : 'OAuth failed';
            res.redirect(`${frontendUrl}/settings?lichess=error&message=${encodeURIComponent(errorMessage)}`);
        }
    }

    @Post('lichess/disconnect')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Disconnect Lichess account' })
    @ApiResponse({ status: 200, description: 'Lichess account disconnected' })
    async disconnectLichess(@Req() req: Request) {
        const user = req.user as { id: string };
        await this.authService.disconnectLichess(user.id);
        return { message: 'Lichess account disconnected' };
    }
}
