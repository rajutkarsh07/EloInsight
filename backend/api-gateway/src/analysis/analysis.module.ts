import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisController } from './analysis.controller';
import { AnalysisGrpcService } from './analysis-grpc.service';

@Module({
    imports: [ConfigModule],
    controllers: [AnalysisController],
    providers: [AnalysisGrpcService],
    exports: [AnalysisGrpcService],
})
export class AnalysisModule { }
