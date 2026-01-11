import { PrismaClient, Platform, Theme, GameResult, TimeClass, AnalysisStatus, MoveClassification, PlayerColor, PeriodType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed the database with sample data for development and testing
 */
async function main() {
    console.log('🌱 Starting database seed...\n');

    // Clean existing data (in reverse order of dependencies)
    console.log('🧹 Cleaning existing data...');
    await prisma.positionAnalysis.deleteMany();
    await prisma.moveEvaluation.deleteMany();
    await prisma.analysis.deleteMany();
    await prisma.move.deleteMany();
    await prisma.analysisJob.deleteMany();
    await prisma.syncJob.deleteMany();
    await prisma.game.deleteMany();
    await prisma.openingStatistics.deleteMany();
    await prisma.userStatistics.deleteMany();
    await prisma.linkedAccount.deleteMany();
    await prisma.userSettings.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();

    // ==========================================
    // CREATE USERS
    // ==========================================
    console.log('👤 Creating users...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    const user1 = await prisma.user.create({
        data: {
            email: 'magnus@eloinsight.com',
            username: 'magnus_fan',
            passwordHash: hashedPassword,
            emailVerified: true,
            isActive: true,
        },
    });

    const user2 = await prisma.user.create({
        data: {
            email: 'hikaru@eloinsight.com',
            username: 'hikaru_speed',
            passwordHash: hashedPassword,
            emailVerified: true,
            isActive: true,
        },
    });

    const user3 = await prisma.user.create({
        data: {
            email: 'demo@eloinsight.com',
            username: 'demo_user',
            passwordHash: hashedPassword,
            emailVerified: false,
            isActive: true,
        },
    });

    console.log(`   ✓ Created ${3} users`);

    // ==========================================
    // CREATE USER PROFILES
    // ==========================================
    console.log('📋 Creating user profiles...');

    await prisma.userProfile.createMany({
        data: [
            {
                userId: user1.id,
                firstName: 'Magnus',
                lastName: 'Carlsen',
                bio: 'Chess enthusiast and former world champion fan',
                country: 'NO',
                timezone: 'Europe/Oslo',
            },
            {
                userId: user2.id,
                firstName: 'Hikaru',
                lastName: 'Nakamura',
                bio: 'Speed chess lover and streamer',
                country: 'US',
                timezone: 'America/Los_Angeles',
            },
            {
                userId: user3.id,
                firstName: 'Demo',
                lastName: 'User',
                bio: 'Testing EloInsight features',
                country: 'GB',
                timezone: 'Europe/London',
            },
        ],
    });

    console.log(`   ✓ Created ${3} user profiles`);

    // ==========================================
    // CREATE USER SETTINGS
    // ==========================================
    console.log('⚙️ Creating user settings...');

    await prisma.userSettings.createMany({
        data: [
            {
                userId: user1.id,
                theme: Theme.DARK,
                boardStyle: 'wood',
                pieceSet: 'neo',
                analysisDepth: 25,
            },
            {
                userId: user2.id,
                theme: Theme.LIGHT,
                boardStyle: 'blue',
                pieceSet: 'alpha',
                analysisDepth: 20,
            },
            {
                userId: user3.id,
                theme: Theme.AUTO,
                boardStyle: 'classic',
                pieceSet: 'standard',
                analysisDepth: 18,
            },
        ],
    });

    console.log(`   ✓ Created ${3} user settings`);

    // ==========================================
    // CREATE LINKED ACCOUNTS
    // ==========================================
    console.log('🔗 Creating linked accounts...');

    const linkedAccount1 = await prisma.linkedAccount.create({
        data: {
            userId: user1.id,
            platform: Platform.CHESS_COM,
            platformUsername: 'MagnusCarlsen',
            platformUserId: 'mc-12345',
            isActive: true,
            syncEnabled: true,
            lastSyncAt: new Date(Date.now() - 3600000), // 1 hour ago
        },
    });

    const linkedAccount2 = await prisma.linkedAccount.create({
        data: {
            userId: user1.id,
            platform: Platform.LICHESS,
            platformUsername: 'DrNykterstein',
            platformUserId: 'DrNykterstein',
            isActive: true,
            syncEnabled: true,
        },
    });

    const linkedAccount3 = await prisma.linkedAccount.create({
        data: {
            userId: user2.id,
            platform: Platform.CHESS_COM,
            platformUsername: 'Hikaru',
            platformUserId: 'hikaru-67890',
            isActive: true,
            syncEnabled: true,
        },
    });

    console.log(`   ✓ Created ${3} linked accounts`);

    // ==========================================
    // CREATE GAMES
    // ==========================================
    console.log('♟️ Creating games...');

    const samplePgn1 = `[Event "Titled Tuesday"]
[Site "Chess.com"]
[Date "2026.01.10"]
[White "MagnusCarlsen"]
[Black "Opponent1"]
[Result "1-0"]
[WhiteElo "2850"]
[BlackElo "2650"]
[TimeControl "180+1"]
[ECO "B90"]
[Opening "Sicilian Defense: Najdorf Variation"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O 10. O-O-O Nbd7 11. g4 b5 12. g5 Nh5 13. Kb1 Rc8 14. Nd5 Bxd5 15. exd5 1-0`;

    const samplePgn2 = `[Event "Rapid Championship"]
[Site "Lichess.org"]
[Date "2026.01.09"]
[White "DrNykterstein"]
[Black "ChessPlayer123"]
[Result "1-0"]
[WhiteElo "2900"]
[BlackElo "2500"]
[TimeControl "600+0"]
[ECO "C50"]
[Opening "Italian Game"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 d6 6. c3 O-O 7. Re1 a6 8. Bb3 Ba7 9. h3 Be6 10. Bxe6 fxe6 11. Bg5 h6 12. Bh4 g5 13. Bg3 Nh5 14. Nbd2 Nxg3 15. fxg3 1-0`;

    const samplePgn3 = `[Event "Blitz Battle"]
[Site "Chess.com"]
[Date "2026.01.08"]
[White "Opponent2"]
[Black "MagnusCarlsen"]
[Result "0-1"]
[WhiteElo "2700"]
[BlackElo "2850"]
[TimeControl "180"]
[ECO "D37"]
[Opening "Queen's Gambit Declined"]

1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Be7 5. Bf4 O-O 6. e3 c5 7. dxc5 Bxc5 8. a3 Nc6 9. Qc2 Qa5 10. Rd1 Be7 11. Be2 dxc4 12. Bxc4 Nh5 13. Be5 Nxe5 14. Nxe5 Nf6 15. O-O Bd7 0-1`;

    const game1 = await prisma.game.create({
        data: {
            userId: user1.id,
            platform: Platform.CHESS_COM,
            externalId: 'cc-game-001',
            pgn: samplePgn1,
            whitePlayer: 'MagnusCarlsen',
            blackPlayer: 'Opponent1',
            whiteRating: 2850,
            blackRating: 2650,
            userColor: PlayerColor.WHITE,
            result: GameResult.WHITE_WIN,
            termination: 'resignation',
            timeControl: '180+1',
            timeClass: TimeClass.BLITZ,
            openingEco: 'B90',
            openingName: 'Sicilian Defense',
            openingVariation: 'Najdorf Variation',
            eventName: 'Titled Tuesday',
            site: 'Chess.com',
            playedAt: new Date('2026-01-10T14:30:00Z'),
            analysisStatus: AnalysisStatus.COMPLETED,
        },
    });

    const game2 = await prisma.game.create({
        data: {
            userId: user1.id,
            platform: Platform.LICHESS,
            externalId: 'lichess-game-001',
            pgn: samplePgn2,
            whitePlayer: 'DrNykterstein',
            blackPlayer: 'ChessPlayer123',
            whiteRating: 2900,
            blackRating: 2500,
            userColor: PlayerColor.WHITE,
            result: GameResult.WHITE_WIN,
            termination: 'resignation',
            timeControl: '600+0',
            timeClass: TimeClass.RAPID,
            openingEco: 'C50',
            openingName: 'Italian Game',
            eventName: 'Rapid Championship',
            site: 'Lichess.org',
            playedAt: new Date('2026-01-09T10:00:00Z'),
            analysisStatus: AnalysisStatus.COMPLETED,
        },
    });

    const game3 = await prisma.game.create({
        data: {
            userId: user1.id,
            platform: Platform.CHESS_COM,
            externalId: 'cc-game-002',
            pgn: samplePgn3,
            whitePlayer: 'Opponent2',
            blackPlayer: 'MagnusCarlsen',
            whiteRating: 2700,
            blackRating: 2850,
            userColor: PlayerColor.BLACK,
            result: GameResult.BLACK_WIN,
            termination: 'resignation',
            timeControl: '180',
            timeClass: TimeClass.BLITZ,
            openingEco: 'D37',
            openingName: "Queen's Gambit Declined",
            eventName: 'Blitz Battle',
            site: 'Chess.com',
            playedAt: new Date('2026-01-08T18:45:00Z'),
            analysisStatus: AnalysisStatus.PENDING,
        },
    });

    console.log(`   ✓ Created ${3} games`);

    // ==========================================
    // CREATE MOVES
    // ==========================================
    console.log('📝 Creating sample moves...');

    const moves1 = [
        { moveNumber: 1, halfMove: 0, color: PlayerColor.WHITE, san: 'e4', uci: 'e2e4', fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' },
        { moveNumber: 1, halfMove: 1, color: PlayerColor.BLACK, san: 'c5', uci: 'c7c5', fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', fenAfter: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2' },
        { moveNumber: 2, halfMove: 2, color: PlayerColor.WHITE, san: 'Nf3', uci: 'g1f3', fenBefore: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2', fenAfter: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2' },
        { moveNumber: 2, halfMove: 3, color: PlayerColor.BLACK, san: 'd6', uci: 'd7d6', fenBefore: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', fenAfter: 'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3' },
        { moveNumber: 3, halfMove: 4, color: PlayerColor.WHITE, san: 'd4', uci: 'd2d4', fenBefore: 'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', fenAfter: 'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 0 3' },
    ];

    for (const move of moves1) {
        await prisma.move.create({
            data: {
                gameId: game1.id,
                ...move,
            },
        });
    }

    console.log(`   ✓ Created ${moves1.length} moves for game 1`);

    // ==========================================
    // CREATE ANALYSIS
    // ==========================================
    console.log('📊 Creating analysis results...');

    const analysis1 = await prisma.analysis.create({
        data: {
            gameId: game1.id,
            accuracyWhite: 94.5,
            accuracyBlack: 78.3,
            acplWhite: 15.2,
            acplBlack: 42.8,
            blundersWhite: 0,
            blundersBlack: 2,
            mistakesWhite: 1,
            mistakesBlack: 3,
            inaccuraciesWhite: 2,
            inaccuraciesBlack: 4,
            brilliantMovesWhite: 1,
            brilliantMovesBlack: 0,
            goodMovesWhite: 8,
            goodMovesBlack: 5,
            analysisDepth: 25,
            engineVersion: 'Stockfish 16.1',
            totalPositions: 30,
        },
    });

    const analysis2 = await prisma.analysis.create({
        data: {
            gameId: game2.id,
            accuracyWhite: 97.2,
            accuracyBlack: 82.1,
            acplWhite: 8.5,
            acplBlack: 35.2,
            blundersWhite: 0,
            blundersBlack: 1,
            mistakesWhite: 0,
            mistakesBlack: 2,
            inaccuraciesWhite: 1,
            inaccuraciesBlack: 3,
            brilliantMovesWhite: 2,
            brilliantMovesBlack: 0,
            goodMovesWhite: 12,
            goodMovesBlack: 6,
            analysisDepth: 22,
            engineVersion: 'Stockfish 16.1',
            totalPositions: 30,
        },
    });

    console.log(`   ✓ Created ${2} analysis records`);

    // ==========================================
    // CREATE POSITION ANALYSIS
    // ==========================================
    console.log('🔍 Creating position analysis...');

    await prisma.positionAnalysis.createMany({
        data: [
            {
                analysisId: analysis1.id,
                moveNumber: 1,
                halfMove: 0,
                fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
                evaluation: 25,
                bestMove: 'e4',
                playedMove: 'e4',
                isBest: true,
                classification: MoveClassification.BEST,
                centipawnLoss: 0,
                depth: 25,
            },
            {
                analysisId: analysis1.id,
                moveNumber: 1,
                halfMove: 1,
                fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
                evaluation: 30,
                bestMove: 'c5',
                playedMove: 'c5',
                isBest: true,
                classification: MoveClassification.BEST,
                centipawnLoss: 0,
                depth: 25,
            },
            {
                analysisId: analysis1.id,
                moveNumber: 2,
                halfMove: 2,
                fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
                evaluation: 35,
                bestMove: 'Nf3',
                playedMove: 'Nf3',
                isGood: true,
                classification: MoveClassification.GOOD,
                centipawnLoss: 5,
                depth: 25,
            },
        ],
    });

    console.log(`   ✓ Created ${3} position analysis records`);

    // ==========================================
    // CREATE USER STATISTICS
    // ==========================================
    console.log('📈 Creating user statistics...');

    await prisma.userStatistics.createMany({
        data: [
            {
                userId: user1.id,
                periodType: PeriodType.ALL_TIME,
                periodStart: new Date('2020-01-01'),
                periodEnd: new Date('2026-01-11'),
                totalGames: 1250,
                wins: 625,
                losses: 450,
                draws: 175,
                winRate: 50.0,
                winRateWhite: 55.0,
                winRateBlack: 45.0,
                averageAccuracy: 91.5,
                averageAccuracyWhite: 93.2,
                averageAccuracyBlack: 89.8,
                averageAcpl: 22.5,
                totalBlunders: 125,
                totalMistakes: 350,
                totalInaccuracies: 625,
                gamesByTimeControl: { bullet: 500, blitz: 550, rapid: 150, classical: 50 },
                favoriteOpening: 'Sicilian Defense',
                peakRating: 2150,
                currentRating: 2100,
                ratingChange: -50,
            },
            {
                userId: user1.id,
                periodType: PeriodType.MONTHLY,
                periodStart: new Date('2026-01-01'),
                periodEnd: new Date('2026-01-31'),
                totalGames: 45,
                wins: 25,
                losses: 15,
                draws: 5,
                winRate: 55.56,
                averageAccuracy: 92.8,
                averageAcpl: 18.3,
                totalBlunders: 3,
                totalMistakes: 12,
                totalInaccuracies: 25,
            },
            {
                userId: user2.id,
                periodType: PeriodType.ALL_TIME,
                periodStart: new Date('2020-01-01'),
                periodEnd: new Date('2026-01-11'),
                totalGames: 850,
                wins: 450,
                losses: 300,
                draws: 100,
                winRate: 52.94,
                averageAccuracy: 88.5,
                averageAcpl: 28.2,
                favoriteOpening: 'Italian Game',
                peakRating: 1950,
                currentRating: 1900,
            },
        ],
    });

    console.log(`   ✓ Created ${3} user statistics records`);

    // ==========================================
    // CREATE OPENING STATISTICS
    // ==========================================
    console.log('📖 Creating opening statistics...');

    await prisma.openingStatistics.createMany({
        data: [
            {
                userId: user1.id,
                openingEco: 'B90',
                openingName: 'Sicilian Defense: Najdorf Variation',
                gamesAsWhite: 120,
                winsAsWhite: 70,
                lossesAsWhite: 35,
                drawsAsWhite: 15,
                winRateWhite: 58.33,
                averageAccuracyWhite: 92.5,
                gamesAsBlack: 85,
                winsAsBlack: 45,
                lossesAsBlack: 30,
                drawsAsBlack: 10,
                winRateBlack: 52.94,
                averageAccuracyBlack: 90.2,
                totalGames: 205,
                overallWinRate: 56.10,
                averageAccuracy: 91.5,
                lastPlayedAt: new Date('2026-01-10T14:30:00Z'),
            },
            {
                userId: user1.id,
                openingEco: 'C50',
                openingName: 'Italian Game',
                gamesAsWhite: 95,
                winsAsWhite: 55,
                lossesAsWhite: 30,
                drawsAsWhite: 10,
                winRateWhite: 57.89,
                averageAccuracyWhite: 93.1,
                gamesAsBlack: 45,
                winsAsBlack: 22,
                lossesAsBlack: 18,
                drawsAsBlack: 5,
                winRateBlack: 48.89,
                averageAccuracyBlack: 88.5,
                totalGames: 140,
                overallWinRate: 55.0,
                averageAccuracy: 91.2,
                lastPlayedAt: new Date('2026-01-09T10:00:00Z'),
            },
            {
                userId: user1.id,
                openingEco: 'D37',
                openingName: "Queen's Gambit Declined",
                gamesAsWhite: 40,
                winsAsWhite: 20,
                lossesAsWhite: 15,
                drawsAsWhite: 5,
                winRateWhite: 50.0,
                averageAccuracyWhite: 89.8,
                gamesAsBlack: 60,
                winsAsBlack: 35,
                lossesAsBlack: 20,
                drawsAsBlack: 5,
                winRateBlack: 58.33,
                averageAccuracyBlack: 91.2,
                totalGames: 100,
                overallWinRate: 55.0,
                averageAccuracy: 90.6,
                lastPlayedAt: new Date('2026-01-08T18:45:00Z'),
            },
        ],
    });

    console.log(`   ✓ Created ${3} opening statistics records`);

    // ==========================================
    // CREATE SYNC JOBS
    // ==========================================
    console.log('🔄 Creating sync jobs...');

    await prisma.syncJob.createMany({
        data: [
            {
                userId: user1.id,
                linkedAccountId: linkedAccount1.id,
                status: 'COMPLETED',
                totalGames: 50,
                processedGames: 50,
                newGames: 12,
                skippedGames: 38,
                startedAt: new Date(Date.now() - 7200000),
                completedAt: new Date(Date.now() - 3600000),
            },
            {
                userId: user1.id,
                linkedAccountId: linkedAccount2.id,
                status: 'COMPLETED',
                totalGames: 30,
                processedGames: 30,
                newGames: 8,
                skippedGames: 22,
                startedAt: new Date(Date.now() - 86400000),
                completedAt: new Date(Date.now() - 82800000),
            },
        ],
    });

    console.log(`   ✓ Created ${2} sync jobs`);

    // ==========================================
    // CREATE ANALYSIS JOBS
    // ==========================================
    console.log('⚡ Creating analysis jobs...');

    await prisma.analysisJob.createMany({
        data: [
            {
                gameId: game1.id,
                userId: user1.id,
                status: 'COMPLETED',
                depth: 25,
                priority: 8,
                totalPositions: 30,
                analyzedPositions: 30,
                startedAt: new Date(Date.now() - 600000),
                completedAt: new Date(Date.now() - 300000),
            },
            {
                gameId: game2.id,
                userId: user1.id,
                status: 'COMPLETED',
                depth: 22,
                priority: 5,
                totalPositions: 30,
                analyzedPositions: 30,
                startedAt: new Date(Date.now() - 1800000),
                completedAt: new Date(Date.now() - 1500000),
            },
            {
                gameId: game3.id,
                userId: user1.id,
                status: 'QUEUED',
                depth: 20,
                priority: 5,
                totalPositions: 30,
                analyzedPositions: 0,
            },
        ],
    });

    console.log(`   ✓ Created ${3} analysis jobs`);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   • Users: 3');
    console.log('   • User Profiles: 3');
    console.log('   • User Settings: 3');
    console.log('   • Linked Accounts: 3');
    console.log('   • Games: 3');
    console.log('   • Moves: 5');
    console.log('   • Analysis: 2');
    console.log('   • Position Analysis: 3');
    console.log('   • User Statistics: 3');
    console.log('   • Opening Statistics: 3');
    console.log('   • Sync Jobs: 2');
    console.log('   • Analysis Jobs: 3');
    console.log('\n🔑 Demo Credentials:');
    console.log('   Email: demo@eloinsight.com');
    console.log('   Password: password123');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
