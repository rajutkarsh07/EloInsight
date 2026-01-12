import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GamesController } from './games.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [HttpModule, AuthModule],
    controllers: [GamesController],
})
export class GamesModule { }
