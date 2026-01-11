import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { ChessComModule } from '../chess-com/chess-com.module';
import { LichessModule } from '../lichess/lichess.module';

@Module({
    imports: [ChessComModule, LichessModule],
    providers: [SyncService],
    controllers: [SyncController],
    exports: [SyncService],
})
export class SyncModule { }
