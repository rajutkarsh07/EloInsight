import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto/auth.dto';

// Mock user database (replace with real database later)
interface User {
    id: string;
    email: string;
    username: string;
    password: string;
    createdAt: Date;
}

@Injectable()
export class AuthService {
    // In-memory user storage (temporary - replace with database)
    private users: User[] = [];

    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {
        // Create a demo user for testing
        this.createDemoUser();
    }

    private async createDemoUser() {
        const hashedPassword = await bcrypt.hash('password123', 10);
        this.users.push({
            id: '1',
            email: 'demo@eloinsight.dev',
            username: 'demo',
            password: hashedPassword,
            createdAt: new Date(),
        });
    }

    async register(registerDto: RegisterDto) {
        const { email, username, password } = registerDto;

        // Check if user already exists
        const existingUser = this.users.find((u) => u.email === email);
        if (existingUser) {
            throw new UnauthorizedException('User already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user: User = {
            id: String(this.users.length + 1),
            email,
            username,
            password: hashedPassword,
            createdAt: new Date(),
        };

        this.users.push(user);

        // Generate tokens
        return this.generateTokens(user);
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
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 900, // 15 minutes in seconds
            },
        };
    }

    async validateUser(email: string): Promise<User | null> {
        return this.users.find((u) => u.email === email) || null;
    }
}
