import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { EmailService } from './email.service';

// User interface with verification fields
// User interface with verification fields
interface User {
    id: string;
    email: string;
    username: string;
    password: string;
    isVerified: boolean;
    verificationToken: string | null;
    verificationExpires: Date | null;
    createdAt: Date;
    chessComUsername?: string;
    lichessUsername?: string;
}

@Injectable()
export class AuthService {
    // In-memory user storage (temporary - replace with database)
    private users: User[] = [];

    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        private emailService: EmailService,
    ) {
        // Create a demo user for testing (pre-verified)
        this.createDemoUser();
    }

    private async createDemoUser() {
        const hashedPassword = await bcrypt.hash('password123', 10);
        this.users.push({
            id: '1',
            email: 'demo@eloinsight.dev',
            username: 'demo',
            password: hashedPassword,
            isVerified: true, // Demo user is pre-verified
            verificationToken: null,
            verificationExpires: null,
            createdAt: new Date(),
            chessComUsername: 'magnuscarlsen', // Mock data
            lichessUsername: 'DrNykterstein',  // Mock data
        });
    }

    async register(registerDto: RegisterDto) {
        const { email, username, password } = registerDto;

        // Check if email already exists
        const existingEmail = this.users.find((u) => u.email === email);
        if (existingEmail) {
            throw new BadRequestException('Email already registered');
        }

        // Check if username already exists
        const existingUsername = this.users.find((u) => u.username === username);
        if (existingUsername) {
            throw new BadRequestException('Username already taken');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate verification token
        const verificationToken = uuidv4();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user
        const user: User = {
            id: String(this.users.length + 1),
            email,
            username,
            password: hashedPassword,
            isVerified: false,
            verificationToken,
            verificationExpires,
            createdAt: new Date(),
        };

        this.users.push(user);

        // Send verification email
        try {
            await this.emailService.sendVerificationEmail(email, verificationToken, username);
        } catch (error) {
            console.error('Failed to send verification email:', error);
            // Don't fail registration if email fails, but log it
        }

        return {
            message: 'Registration successful. Please check your email to verify your account.',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isVerified: user.isVerified,
            },
        };
    }

    async verifyEmail(token: string) {
        const user = this.users.find((u) => u.verificationToken === token);

        if (!user) {
            throw new BadRequestException('Invalid verification token');
        }

        if (user.verificationExpires && user.verificationExpires < new Date()) {
            throw new BadRequestException('Verification token has expired');
        }

        // Mark user as verified
        user.isVerified = true;
        user.verificationToken = null;
        user.verificationExpires = null;

        return {
            message: 'Email verified successfully. You can now log in.',
            verified: true,
        };
    }

    async resendVerification(email: string) {
        const user = this.users.find((u) => u.email === email);

        if (!user) {
            // Don't reveal if email exists
            return {
                message: 'If this email is registered, a verification link has been sent.',
            };
        }

        if (user.isVerified) {
            throw new BadRequestException('Email is already verified');
        }

        // Generate new token
        const verificationToken = uuidv4();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        user.verificationToken = verificationToken;
        user.verificationExpires = verificationExpires;

        // Send verification email
        try {
            await this.emailService.sendVerificationEmail(email, verificationToken, user.username);
        } catch (error) {
            console.error('Failed to send verification email:', error);
        }

        return {
            message: 'If this email is registered, a verification link has been sent.',
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        // Find user
        const user = this.users.find((u) => u.email === email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if verified
        if (!user.isVerified) {
            throw new UnauthorizedException('Please verify your email before logging in');
        }

        // Generate tokens
        return this.generateTokens(user);
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });

            const user = this.users.find((u) => u.id === payload.sub);
            if (!user) {
                throw new UnauthorizedException('Invalid token');
            }

            return this.generateTokens(user);
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    private async generateTokens(user: User) {
        const payload = {
            sub: user.id,
            email: user.email,
            username: user.username,
        };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isVerified: user.isVerified,
                chessComUsername: user.chessComUsername,
                lichessUsername: user.lichessUsername,
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 900, // 15 minutes in seconds
            },
        };
    }

    // Helper to get user by ID
    async getUserById(id: string): Promise<User | null> {
        return this.users.find(u => u.id === id) || null;
    }

    // Update user profile
    async updateProfile(userId: string, data: { chessComUsername?: string; lichessUsername?: string }) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (data.chessComUsername !== undefined) user.chessComUsername = data.chessComUsername;
        if (data.lichessUsername !== undefined) user.lichessUsername = data.lichessUsername;

        return {
            id: user.id,
            email: user.email,
            username: user.username,
            chessComUsername: user.chessComUsername,
            lichessUsername: user.lichessUsername,
        };
    }

    // ... (existing validateUser)
    async validateUser(email: string): Promise<User | null> {
        return this.users.find((u) => u.email === email) || null;
    }
}
