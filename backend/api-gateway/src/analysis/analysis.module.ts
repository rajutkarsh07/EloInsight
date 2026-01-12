import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisController } from './analysis.controller';
import { AnalysisGrpcService } from './analysis-grpc.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [AnalysisController],
    providers: [AnalysisGrpcService],
    exports: [AnalysisGrpcService],
})
export class AnalysisModule { }
