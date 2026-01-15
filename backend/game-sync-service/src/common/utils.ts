import { GameResult, TimeClass } from './types';
import { detectOpeningFromMoves } from './openings';

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
 * Parse ECO code from PGN - supports multiple formats
 * Falls back to opening detection from move sequence if tags are missing
 */
export function parseEcoFromPgn(pgn: string): { eco?: string; name?: string } {
    // Standard ECO tag
    const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/);
    // Standard Opening tag
    const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/);

    let eco = ecoMatch ? ecoMatch[1] : undefined;
    let name = openingMatch ? openingMatch[1] : undefined;

    // Chess.com uses ECOUrl tag like [ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Open-2...Nc6-3.d4"]
    if (!name) {
        const ecoUrlMatch = pgn.match(/\[ECOUrl\s+"([^"]+)"\]/);
        if (ecoUrlMatch) {
            const url = ecoUrlMatch[1];
            // Extract opening name from URL: .../openings/Sicilian-Defense-Open-...
            const openingFromUrl = url.match(/openings\/([^\/\?]+)/);
            if (openingFromUrl) {
                // Convert URL format to readable name: "Sicilian-Defense-Open" -> "Sicilian Defense Open"
                name = openingFromUrl[1]
                    .replace(/-/g, ' ')
                    .replace(/\d+\.+\w+/g, '') // Remove move numbers like "2...Nc6"
                    .replace(/\s+/g, ' ')
                    .trim();
                
                // Capitalize first letter of each word
                name = name.replace(/\b\w/g, c => c.toUpperCase());
            }
        }
    }

    // Try to get ECO from ECOUrl if not found
    if (!eco && name) {
        // Try to infer ECO from opening name patterns
        const ecoUrlMatch = pgn.match(/\[ECOUrl\s+"[^"]*\/([A-E]\d{2})/);
        if (ecoUrlMatch) {
            eco = ecoUrlMatch[1];
        }
    }

    // FALLBACK: Detect opening from move sequence if no tags found
    if (!eco && !name && pgn) {
        const detected = detectOpeningFromMoves(pgn);
        if (detected.name) {
            eco = detected.eco;
            name = detected.name;
            console.log(`[parseEcoFromPgn] Detected from moves: ECO=${eco}, Name=${name}`);
        }
    }

    if (eco || name) {
        console.log(`[parseEcoFromPgn] Result: ECO=${eco}, Name=${name}`);
    }

    return { eco, name };
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
