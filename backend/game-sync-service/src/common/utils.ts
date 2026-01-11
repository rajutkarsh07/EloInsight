import { GameResult, TimeClass } from './types';

/**
 * Parse time control string to determine time class
 */
export function parseTimeClass(timeControl: string, platform: 'chess.com' | 'lichess'): TimeClass {
    if (!timeControl) return TimeClass.RAPID;

    // Handle daily/correspondence
    if (timeControl.includes('/') || timeControl.toLowerCase().includes('day')) {
        return TimeClass.DAILY;
    }

    // Parse initial time + increment format (e.g., "600+5", "180", "300+0")
    const parts = timeControl.split('+');
    const initialSeconds = parseInt(parts[0], 10);
    const increment = parts[1] ? parseInt(parts[1], 10) : 0;

    // Estimated total time = initial + 40 moves * increment
    const estimatedTime = initialSeconds + (40 * increment);

    if (estimatedTime < 30) return TimeClass.ULTRABULLET;
    if (estimatedTime < 180) return TimeClass.BULLET;
    if (estimatedTime < 600) return TimeClass.BLITZ;
    if (estimatedTime < 1800) return TimeClass.RAPID;
    return TimeClass.CLASSICAL;
}

/**
 * Parse Chess.com result string to GameResult
 */
export function parseChessComResult(whiteResult: string, blackResult: string): GameResult {
    if (whiteResult === 'win') return GameResult.WHITE_WIN;
    if (blackResult === 'win') return GameResult.BLACK_WIN;

    const drawResults = ['agreed', 'stalemate', 'repetition', 'insufficient', '50move', 'timevsinsufficient'];
    if (drawResults.includes(whiteResult) || drawResults.includes(blackResult)) {
        return GameResult.DRAW;
    }

    if (whiteResult === 'checkmated' || whiteResult === 'timeout' || whiteResult === 'resigned' || whiteResult === 'abandoned') {
        return GameResult.BLACK_WIN;
    }
    if (blackResult === 'checkmated' || blackResult === 'timeout' || blackResult === 'resigned' || blackResult === 'abandoned') {
        return GameResult.WHITE_WIN;
    }

    return GameResult.DRAW;
}

/**
 * Parse Lichess game status to GameResult
 */
export function parseLichessResult(status: string, winner?: string): GameResult {
    if (winner === 'white') return GameResult.WHITE_WIN;
    if (winner === 'black') return GameResult.BLACK_WIN;

    const drawStatuses = ['draw', 'stalemate', 'outoftime'];
    if (drawStatuses.includes(status.toLowerCase())) {
        return GameResult.DRAW;
    }

    // If there's a winner indication but not in 'winner' field
    if (status.toLowerCase() === 'mate' || status.toLowerCase() === 'resign' || status.toLowerCase() === 'timeout') {
        // These should have a winner, if not it's a draw (e.g., timeout with insufficient material)
        return winner ? (winner === 'white' ? GameResult.WHITE_WIN : GameResult.BLACK_WIN) : GameResult.DRAW;
    }

    return GameResult.DRAW;
}

/**
 * Extract game ID from URL
 */
export function extractGameId(url: string, platform: 'chess.com' | 'lichess'): string {
    if (platform === 'chess.com') {
        // https://www.chess.com/game/live/12345678
        const match = url.match(/\/game\/(?:live|daily)\/(\d+)/);
        return match ? match[1] : url;
    } else {
        // https://lichess.org/abcd1234
        const match = url.match(/lichess\.org\/(\w+)/);
        return match ? match[1] : url;
    }
}

/**
 * Parse ECO code from PGN
 */
export function parseEcoFromPgn(pgn: string): { eco?: string; name?: string } {
    const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/);
    const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/);

    return {
        eco: ecoMatch ? ecoMatch[1] : undefined,
        name: openingMatch ? openingMatch[1] : undefined,
    };
}

/**
 * Parse termination from PGN
 */
export function parseTerminationFromPgn(pgn: string): string | undefined {
    const match = pgn.match(/\[Termination\s+"([^"]+)"\]/);
    return match ? match[1] : undefined;
}

/**
 * Convert Lichess speed to TimeClass
 */
export function lichessSpeedToTimeClass(speed: string): TimeClass {
    const speedMap: Record<string, TimeClass> = {
        ultraBullet: TimeClass.ULTRABULLET,
        bullet: TimeClass.BULLET,
        blitz: TimeClass.BLITZ,
        rapid: TimeClass.RAPID,
        classical: TimeClass.CLASSICAL,
        correspondence: TimeClass.DAILY,
    };
    return speedMap[speed] || TimeClass.RAPID;
}

/**
 * Calculate date range for sync based on last sync time
 */
export function getSyncDateRange(lastSyncAt?: Date, defaultMonthsBack: number = 6): { since: Date; until: Date } {
    const until = new Date();

    let since: Date;
    if (lastSyncAt) {
        // Start from 1 day before last sync to catch any missed games
        since = new Date(lastSyncAt);
        since.setDate(since.getDate() - 1);
    } else {
        // Default: go back specified months
        since = new Date();
        since.setMonth(since.getMonth() - defaultMonthsBack);
    }

    return { since, until };
}

/**
 * Get Chess.com archive URLs for a date range
 */
export function getArchiveUrlsInRange(
    archives: string[],
    since: Date,
    until: Date,
): string[] {
    return archives.filter(url => {
        // Archive URLs are in format: .../games/YYYY/MM
        const match = url.match(/\/games\/(\d{4})\/(\d{2})$/);
        if (!match) return false;

        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed

        const archiveDate = new Date(year, month);
        const archiveEndDate = new Date(year, month + 1, 0); // Last day of month

        return archiveEndDate >= since && archiveDate <= until;
    });
}
