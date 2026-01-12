import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GamesController } from './games.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [HttpModule, AuthModule, PrismaModule],
    controllers: [GamesController],
})
export class GamesModule { }
