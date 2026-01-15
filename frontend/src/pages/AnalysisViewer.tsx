import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCw, AlertTriangle, XCircle, MinusCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Star, Zap, Check, ArrowLeft, Target, BookOpen, RefreshCw, Undo2, FlaskConical, Loader2, ChevronDown, TrendingUp, Copy, CheckCircle, Crosshair, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot } from 'recharts';
import ChessBoardViewer from '../components/chess/ChessBoardViewer';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

// Interface for exploration position analysis response
interface ExplorationEvaluation {
    evaluation: number | null;
    mateIn: number | null;
    bestMove: string | null;
    bestMoveUci: string | null;
    loading: boolean;
}

interface MoveAnalysis {
    moveNumber: number;
    halfMove: number;
    fen: string;
    evaluation: number | null;
    mateIn: number | null;
    bestMove: string;
    bestMoveUci?: string | null; // UCI format for arrow display
    playedMove: string;
    playedMoveUci?: string | null; // UCI format for last move highlight (e.g., "e2e4")
    classification: string;
    centipawnLoss: number | null;
    isBlunder: boolean;
    isMistake: boolean;
    isInaccuracy: boolean;
    isBrilliant: boolean;
    isGood: boolean;
    isBest: boolean;
    pv: string[];
    depth: number | null;
    // Time analysis fields (optional - may not be available for all games)
    timeSpent?: number | null; // Time spent on move in milliseconds
    clockAfter?: string | null; // Remaining clock time after move
}

// Extract destination square from SAN notation (e.g., "Nf3" -> "f3", "e4" -> "e4", "Qxd5" -> "d5")
// Note: For castling, this returns undefined - castling is handled separately
const extractDestinationSquare = (san: string): string | undefined => {
    if (!san) return undefined;

    // Castling doesn't have a simple destination square
    if (san === 'O-O' || san === 'O-O-O') {
        return undefined; // Will be handled separately
    }

    // Remove check/checkmate symbols and promotion piece (but keep the destination)
    // e.g., "h8=Q+" -> "h8", "exd8=Q#" -> "d8"
    const cleaned = san.replace(/[+#]/g, '').replace(/=[QRBN]/, '');
    // Match the last two characters that form a valid square (letter a-h + number 1-8)
    const match = cleaned.match(/([a-h][1-8])$/);
    return match ? match[1] : undefined;
};

// Parse FEN to get piece positions as a map: square -> piece
const parseFenToSquares = (fen: string): Record<string, string> => {
    const pieces: Record<string, string> = {};
    const [position] = fen.split(' ');
    const rows = position.split('/');

    for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
        const row = rows[rowIdx];
        let colIdx = 0;
        for (const char of row) {
            if (char >= '1' && char <= '8') {
                colIdx += parseInt(char);
            } else {
                const square = String.fromCharCode(97 + colIdx) + (8 - rowIdx);
                pieces[square] = char;
                colIdx++;
            }
        }
    }
    return pieces;
};

// Find the source square by comparing two FENs (before and after a move)
const findSourceSquare = (fenBefore: string, fenAfter: string, destinationSquare: string | undefined, playedMove?: string): string | undefined => {
    if (!fenBefore || !fenAfter || !destinationSquare) return undefined;

    const before = parseFenToSquares(fenBefore);
    const after = parseFenToSquares(fenAfter);

    // Handle castling first (O-O or O-O-O notation)
    if (playedMove === 'O-O' || playedMove === 'O-O-O') {
        // Determine the row based on which side castled (check if white or black king moved)
        const row = after['g1']?.toLowerCase() === 'k' || after['c1']?.toLowerCase() === 'k' ? '1' : '8';
        return 'e' + row; // King always starts on e-file
    }

    // The piece that moved TO the destination
    const movedPiece = after[destinationSquare];
    if (!movedPiece) return undefined;

    // Handle promotion: pawn becomes queen/rook/bishop/knight
    // Look for a pawn that disappeared from an adjacent file on the previous rank
    const isPromotion = playedMove?.includes('=');
    if (isPromotion) {
        const destCol = destinationSquare.charCodeAt(0) - 97; // 0-7
        const destRow = parseInt(destinationSquare[1]);

        // Pawn promotes on rank 8 (white) or rank 1 (black)
        // Source is one rank behind the destination
        const sourceRow = destRow === 8 ? 7 : 2; // If promoted to 8, came from 7; if to 1, came from 2

        // Check same file first (non-capture promotion)
        const sameFileSource = String.fromCharCode(97 + destCol) + sourceRow;
        if (before[sameFileSource]?.toLowerCase() === 'p' && !after[sameFileSource]) {
            return sameFileSource;
        }

        // Check adjacent files (capture promotion)
        for (const colOffset of [-1, 1]) {
            const srcCol = destCol + colOffset;
            if (srcCol >= 0 && srcCol <= 7) {
                const captureSource = String.fromCharCode(97 + srcCol) + sourceRow;
                if (before[captureSource]?.toLowerCase() === 'p' && !after[captureSource]) {
                    return captureSource;
                }
            }
        }
    }

    // Standard move: find where this piece came FROM
    // Look for a square that had the same piece before but is now empty or different
    for (const square of Object.keys(before)) {
        if (square === destinationSquare) continue;

        // Same piece type was here before, and now it's gone or different
        if (before[square] === movedPiece && after[square] !== movedPiece) {
            return square;
        }
    }

    // Handle castling: if king moved 2 squares, source is the original king position
    if (movedPiece.toLowerCase() === 'k') {
        const destCol = destinationSquare.charCodeAt(0) - 97;
        const destRow = destinationSquare[1];
        // Check for castling (king on e-file moving to c or g)
        if (destCol === 2 || destCol === 6) { // c or g file
            const kingSourceSquare = 'e' + destRow;
            if (before[kingSourceSquare]?.toLowerCase() === 'k') {
                return kingSourceSquare;
            }
        }
    }

    // Fallback for any piece that disappeared and destination has a piece
    // Find any square where a piece vanished
    for (const square of Object.keys(before)) {
        if (square === destinationSquare) continue;
        if (before[square] && !after[square]) {
            // This square had a piece and now it's empty - could be our source
            return square;
        }
    }

    return undefined;
};

interface GameMetrics {
    accuracy: number;
    acpl: number;
    blunders: number;
    mistakes: number;
    inaccuracies: number;
    brilliantMoves: number;
    goodMoves: number;
    bookMoves: number;
    performanceRating: number | null;
}

interface GameInfo {
    id: string;
    platform: string;
    whitePlayer: string;
    blackPlayer: string;
    result: string;
    timeControl: string;
    playedAt: string;
    openingName?: string;
    pgn: string;
}

interface FullAnalysis {
    gameId: string;
    status: string;
    game: GameInfo;
    whiteMetrics: GameMetrics;
    blackMetrics: GameMetrics;
    moves: MoveAnalysis[];
    analysisDepth: number;
    engineVersion: string;
    analyzedAt: string;
}

const AnalysisViewer = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
    const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

    // Exploration mode state
    const [isExplorationMode, setIsExplorationMode] = useState(false);
    const [explorationStartIndex, setExplorationStartIndex] = useState<number | null>(null);
    const [explorationFen, setExplorationFen] = useState<string | null>(null);
    const [explorationLastMove, setExplorationLastMove] = useState<string | null>(null);
    const [explorationEval, setExplorationEval] = useState<ExplorationEvaluation>({
        evaluation: null,
        mateIn: null,
        bestMove: null,
        bestMoveUci: null,
        loading: false,
    });
    const explorationAbortRef = useRef<AbortController | null>(null);

    // Move quality filter state - which category is expanded
    const [expandedQualityCategory, setExpandedQualityCategory] = useState<string | null>(null);

    // Copy FEN feedback state
    const [fenCopied, setFenCopied] = useState(false);

    // Determine which color the user played as
    const getUserColor = useCallback((gameData: FullAnalysis): 'white' | 'black' => {
        if (!user) return 'white';

        const whitePlayer = gameData.game.whitePlayer.toLowerCase();
        const blackPlayer = gameData.game.blackPlayer.toLowerCase();

        // Check against user's chess platform usernames
        const usernames = [
            user.username?.toLowerCase(),
            user.chessComUsername?.toLowerCase(),
            user.lichessUsername?.toLowerCase(),
        ].filter(Boolean);

        for (const username of usernames) {
            if (username && blackPlayer.includes(username)) return 'black';
            if (username && whitePlayer.includes(username)) return 'white';
        }

        return 'white'; // Default to white perspective
    }, [user]);

    const flipBoard = useCallback(() => {
        setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
    }, []);

    // Reset exploration mode and return to original game position
    const resetExploration = useCallback(() => {
        // Cancel any pending analysis request
        if (explorationAbortRef.current) {
            explorationAbortRef.current.abort();
            explorationAbortRef.current = null;
        }

        setIsExplorationMode(false);
        setExplorationStartIndex(null);
        setExplorationFen(null);
        setExplorationLastMove(null);
        setExplorationEval({
            evaluation: null,
            mateIn: null,
            bestMove: null,
            bestMoveUci: null,
            loading: false,
        });
    }, []);

    // Handle manual move in exploration mode
    const handleExplorationMove = useCallback(async (move: {
        from: string;
        to: string;
        promotion?: string;
        fen: string;
        san: string
    }) => {
        // If not already in exploration mode, start it
        if (!isExplorationMode) {
            setIsExplorationMode(true);
            setExplorationStartIndex(currentMoveIndex);
        }

        // Update exploration FEN and last move
        setExplorationFen(move.fen);
        setExplorationLastMove(move.from + move.to);

        // Cancel any pending analysis request
        if (explorationAbortRef.current) {
            explorationAbortRef.current.abort();
        }
        explorationAbortRef.current = new AbortController();

        // Set loading state
        setExplorationEval(prev => ({
            ...prev,
            loading: true,
            bestMove: null,
            bestMoveUci: null,
        }));

        try {
            // Call the position analysis API
            const response = await apiClient.post<{
                fen: string;
                depth: number;
                evaluation: {
                    centipawns?: number;
                    mateIn?: number;
                    isMate: boolean;
                };
                bestMove: string;
                pv: string[];
            }>('/analysis/position', {
                fen: move.fen,
                depth: 18, // Good balance of speed and accuracy
                multiPv: 1,
                timeoutMs: 10000,
            });

            // Check if this request was aborted
            if (explorationAbortRef.current?.signal.aborted) {
                return;
            }

            // Parse the best move UCI from PV if available
            let bestMoveUci = null;
            if (response.pv && response.pv.length > 0) {
                // PV contains UCI moves like "e2e4"
                bestMoveUci = response.pv[0];
            }

            // Determine whose turn it is from the FEN
            const fenParts = move.fen.split(' ');
            const isWhiteTurn = fenParts[1] === 'w';

            // The evaluation from the API is from the perspective of the side to move
            // We need to normalize it to White's perspective for consistent display
            let evaluation = response.evaluation.centipawns ?? null;
            let mateIn = response.evaluation.mateIn ?? null;

            // If it's Black's turn, the eval is from Black's perspective, so flip it
            if (!isWhiteTurn && evaluation !== null) {
                evaluation = -evaluation;
            }
            if (!isWhiteTurn && mateIn !== null) {
                mateIn = -mateIn;
            }

            setExplorationEval({
                evaluation,
                mateIn,
                bestMove: response.bestMove,
                bestMoveUci,
                loading: false,
            });
        } catch (err) {
            console.error('Failed to analyze exploration position:', err);
            // Check if this was an abort
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            setExplorationEval(prev => ({
                ...prev,
                loading: false,
            }));
        }
    }, [isExplorationMode, currentMoveIndex]);

    // Reset exploration when navigating to different moves in the original game
    const goToMoveWithReset = useCallback((index: number) => {
        if (isExplorationMode) {
            resetExploration();
        }
        if (!analysis) return;
        const maxIndex = analysis.moves.length;
        setCurrentMoveIndex(Math.max(0, Math.min(index, maxIndex)));
    }, [analysis, isExplorationMode, resetExploration]);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);
                const data = await apiClient.get<FullAnalysis>(`/analysis/game/${gameId}`);

                if (data.status === 'not_analyzed') {
                    setError('This game has not been analyzed yet.');
                    return;
                }

                setAnalysis(data);

                // Auto-orient board based on which color user played
                const userColor = getUserColor(data);
                setBoardOrientation(userColor);

                // Debug: Log data used for Review Graph
                // console.log('📊 Review Graph Data:', {
                //     totalMoves: data.moves.length,
                //     sampleMoves: data.moves.slice(0, 5).map(m => ({
                //         halfMove: m.halfMove,
                //         playedMove: m.playedMove,
                //         evaluation: m.evaluation,
                //         mateIn: m.mateIn,
                //         classification: m.classification,
                //     })),
                //     allEvaluations: data.moves.map(m => m.evaluation),
                // });
            } catch (err) {
                console.error('Error fetching analysis:', err);
                setError('Failed to load analysis');
            } finally {
                setLoading(false);
            }
        };

        if (gameId) {
            fetchAnalysis();
        }
    }, [gameId, getUserColor]);


    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            goToMoveWithReset(currentMoveIndex - 1);
        } else if (e.key === 'ArrowRight') {
            goToMoveWithReset(currentMoveIndex + 1);
        } else if (e.key === 'Home') {
            goToMoveWithReset(0);
        } else if (e.key === 'End' && analysis) {
            goToMoveWithReset(analysis.moves.length);
        } else if (e.key === 'Escape' && isExplorationMode) {
            resetExploration();
        }
    }, [currentMoveIndex, goToMoveWithReset, analysis, isExplorationMode, resetExploration]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const currentFen = useMemo(() => {
        const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

        // If in exploration mode, use the exploration FEN
        if (isExplorationMode && explorationFen) {
            return explorationFen;
        }

        if (!analysis || currentMoveIndex === 0) return startingFen;

        const move = analysis.moves[currentMoveIndex - 1];
        const fen = move?.fen;

        if (fen && typeof fen === 'string' && fen.trim().length > 0) {
            return fen;
        }

        // Fallback: if FEN is not available, keep the starting position
        console.warn('FEN not available for move', currentMoveIndex);
        return startingFen;
    }, [analysis, currentMoveIndex, isExplorationMode, explorationFen]);

    // Copy FEN to clipboard
    const copyFenToClipboard = useCallback(() => {
        if (currentFen) {
            navigator.clipboard.writeText(currentFen).then(() => {
                setFenCopied(true);
                setTimeout(() => setFenCopied(false), 2000);
            });
        }
    }, [currentFen]);

    // Calculate win probability from centipawn evaluation
    // Using the formula: winProb = 50 + 50 * (2 / (1 + exp(-0.004 * centipawns)) - 1)
    const calculateWinProbability = useCallback((centipawns: number | null, mateIn: number | null): { white: number; draw: number; black: number } => {
        if (mateIn !== null) {
            // Mate found
            if (mateIn > 0) {
                return { white: 100, draw: 0, black: 0 };
            } else {
                return { white: 0, draw: 0, black: 100 };
            }
        }
        
        if (centipawns === null) {
            return { white: 50, draw: 0, black: 50 };
        }
        
        // Convert centipawns to win probability using sigmoid function
        const winProb = 50 + 50 * (2 / (1 + Math.exp(-0.004 * centipawns)) - 1);
        
        // Estimate draw probability (higher near 0 eval)
        const drawProb = Math.max(0, 20 - Math.abs(centipawns) / 25);
        
        // Adjust win/loss probabilities for draw
        const adjustedWhite = Math.max(0, Math.min(100, winProb - drawProb / 2));
        const adjustedBlack = Math.max(0, Math.min(100, 100 - winProb - drawProb / 2));
        
        return {
            white: Math.round(adjustedWhite),
            draw: Math.round(drawProb),
            black: Math.round(adjustedBlack),
        };
    }, []);

    // Find key moments (biggest evaluation swings)
    const keyMoments = useMemo(() => {
        if (!analysis || analysis.moves.length < 2) return [];
        
        const moments: Array<{
            moveIndex: number;
            move: MoveAnalysis;
            evalSwing: number;
            type: 'blunder' | 'mistake' | 'brilliant' | 'turning_point';
            description: string;
        }> = [];
        
        for (let i = 1; i < analysis.moves.length; i++) {
            const currentMove = analysis.moves[i];
            const prevMove = analysis.moves[i - 1];
            
            // Calculate eval swing (normalized to white's perspective)
            const isBlackMove = i % 2 === 1;
            let prevEval = prevMove.evaluation ?? 0;
            let currEval = currentMove.evaluation ?? 0;
            
            // Normalize to white's perspective
            if (i % 2 === 0) { // After white's move
                prevEval = -(prevMove.evaluation ?? 0);
                currEval = -(currentMove.evaluation ?? 0);
            }
            
            const evalSwing = Math.abs(currEval - prevEval);
            
            // Identify key moments based on classification and eval swing
            if (currentMove.classification === 'blunder' || evalSwing > 200) {
                moments.push({
                    moveIndex: i + 1,
                    move: currentMove,
                    evalSwing,
                    type: currentMove.classification === 'blunder' ? 'blunder' : 
                          currentMove.classification === 'brilliant' ? 'brilliant' : 'turning_point',
                    description: currentMove.classification === 'blunder' 
                        ? `${isBlackMove ? 'Black' : 'White'} blunders with ${currentMove.playedMove}`
                        : currentMove.classification === 'brilliant'
                        ? `Brilliant ${currentMove.playedMove}!`
                        : `Game-changing ${currentMove.playedMove}`,
                });
            } else if (currentMove.classification === 'brilliant') {
                moments.push({
                    moveIndex: i + 1,
                    move: currentMove,
                    evalSwing,
                    type: 'brilliant',
                    description: `Brilliant ${currentMove.playedMove}!`,
                });
            } else if (currentMove.classification === 'mistake' && evalSwing > 100) {
                moments.push({
                    moveIndex: i + 1,
                    move: currentMove,
                    evalSwing,
                    type: 'mistake',
                    description: `${isBlackMove ? 'Black' : 'White'} mistakes with ${currentMove.playedMove}`,
                });
            }
        }
        
        // Sort by eval swing and take top 5
        return moments
            .sort((a, b) => b.evalSwing - a.evalSwing)
            .slice(0, 5);
    }, [analysis]);

    // Time Analysis - calculate time stats for each player
    const timeAnalysis = useMemo(() => {
        if (!analysis) return null;
        
        const whiteTimes: number[] = [];
        const blackTimes: number[] = [];
        
        analysis.moves.forEach((move, idx) => {
            if (move.timeSpent && move.timeSpent > 0) {
                if (idx % 2 === 0) {
                    whiteTimes.push(move.timeSpent);
                } else {
                    blackTimes.push(move.timeSpent);
                }
            }
        });
        
        // If no time data available, return null
        if (whiteTimes.length === 0 && blackTimes.length === 0) {
            return null;
        }
        
        const calcStats = (times: number[]) => {
            if (times.length === 0) return { avg: 0, max: 0, min: 0, total: 0 };
            const total = times.reduce((a, b) => a + b, 0);
            return {
                avg: total / times.length,
                max: Math.max(...times),
                min: Math.min(...times),
                total,
            };
        };
        
        return {
            white: calcStats(whiteTimes),
            black: calcStats(blackTimes),
            hasData: whiteTimes.length > 0 || blackTimes.length > 0,
            moveTimeData: analysis.moves.map((move, idx) => ({
                moveIndex: idx + 1,
                time: move.timeSpent || 0,
                isWhite: idx % 2 === 0,
                playedMove: move.playedMove,
            })),
        };
    }, [analysis]);

    // Format milliseconds to readable time
    const formatTime = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        const seconds = ms / 1000;
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Valid classification types for the ChessBoardViewer
    type BoardClassification = 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'book' | 'normal' | 'inaccuracy' | 'mistake' | 'blunder' | null;

    // Compute current move data for board visualization
    const currentMoveData = useMemo((): {
        bestMove: string | undefined;
        lastMove: string | undefined;
        classification: BoardClassification;
        destinationSquare: string | undefined;
    } => {
        // If in exploration mode, show exploration-specific data
        if (isExplorationMode) {
            return {
                bestMove: explorationEval.bestMoveUci || undefined,
                lastMove: explorationLastMove || undefined,
                classification: null, // No classification for manual moves
                destinationSquare: explorationLastMove ? explorationLastMove.slice(2, 4) : undefined,
            };
        }

        if (!analysis || currentMoveIndex === 0) {
            return {
                bestMove: undefined,
                lastMove: undefined,
                classification: null,
                destinationSquare: undefined,
            };
        }

        const move = analysis.moves[currentMoveIndex - 1];
        if (!move) {
            return {
                bestMove: undefined,
                lastMove: undefined,
                classification: null,
                destinationSquare: undefined,
            };
        }

        // Extract destination square from played move for classification badge placement
        const destinationSquare = extractDestinationSquare(move.playedMove);

        // Map classification string to valid type
        const validClassifications = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'normal', 'inaccuracy', 'mistake', 'blunder'];
        const classification: BoardClassification = validClassifications.includes(move.classification)
            ? (move.classification as BoardClassification)
            : null;

        // Show best move arrow for bad moves (inaccuracy, mistake, blunder)
        // This shows what the player should have played instead
        // For good moves, no arrow is needed since the player already made the right choice
        const shouldShowArrow = ['inaccuracy', 'mistake', 'blunder'].includes(move.classification);
        const bestMoveUci = shouldShowArrow && move.bestMoveUci ? move.bestMoveUci : undefined;

        // Get last move UCI for highlighting the played move squares
        // This shows the source (darker) and destination (lighter) of the last move
        let lastMoveUci = move.playedMoveUci || undefined;

        // If playedMoveUci is not available, derive it by comparing FENs
        if (!lastMoveUci) {
            // Get the FEN before this move (previous position)
            const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            const previousFen = currentMoveIndex <= 1
                ? startingFen
                : analysis.moves[currentMoveIndex - 2]?.fen || startingFen;
            const currentFenVal = move.fen;

            // Handle castling destination square
            let castlingDestination = destinationSquare;
            if (move.playedMove === 'O-O') {
                // Kingside castling - king goes to g1 or g8
                const row = currentMoveIndex % 2 === 1 ? '1' : '8'; // White moves on odd indices
                castlingDestination = 'g' + row;
            } else if (move.playedMove === 'O-O-O') {
                // Queenside castling - king goes to c1 or c8
                const row = currentMoveIndex % 2 === 1 ? '1' : '8';
                castlingDestination = 'c' + row;
            }

            // Find source square by comparing FENs
            const sourceSquare = findSourceSquare(previousFen, currentFenVal, castlingDestination, move.playedMove);

            if (sourceSquare && castlingDestination) {
                lastMoveUci = sourceSquare + castlingDestination;
            }
        }

        return {
            bestMove: bestMoveUci,
            lastMove: lastMoveUci,
            classification,
            destinationSquare,
        };
    }, [analysis, currentMoveIndex, isExplorationMode, explorationEval.bestMoveUci, explorationLastMove]);

    const getClassificationIcon = (classification: string) => {
        switch (classification) {
            case 'brilliant': return <Star className="h-4 w-4 text-cyan-400" />;
            case 'great': return <Zap className="h-4 w-4 text-blue-400" />;
            case 'best': return <Check className="h-4 w-4 text-green-400" />;
            case 'good': return <Check className="h-4 w-4 text-green-500/70" />;
            case 'book': return <span className="text-xs text-amber-400">📖</span>;
            case 'inaccuracy': return <MinusCircle className="h-4 w-4 text-yellow-400" />;
            case 'mistake': return <AlertTriangle className="h-4 w-4 text-orange-400" />;
            case 'blunder': return <XCircle className="h-4 w-4 text-red-400" />;
            default: return null;
        }
    };

    const getClassificationColor = (classification: string): string => {
        switch (classification) {
            case 'brilliant': return 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400';
            case 'great': return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
            case 'best': return 'bg-green-500/20 border-green-500/30 text-green-400';
            case 'good': return 'bg-green-500/10 border-green-500/20 text-green-500/70';
            case 'book': return 'bg-amber-500/20 border-amber-500/30 text-amber-400';
            case 'inaccuracy': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
            case 'mistake': return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
            case 'blunder': return 'bg-red-500/20 border-red-500/30 text-red-400';
            default: return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400';
        }
    };

    const formatEval = (evaluation: number | null, mateIn: number | null): string => {
        if (mateIn !== null) {
            return mateIn > 0 ? `M${mateIn}` : `M${Math.abs(mateIn)}`;
        }
        if (evaluation === null) return '-';
        const evalPawns = evaluation / 100;
        return evalPawns > 0 ? `+${evalPawns.toFixed(1)}` : evalPawns.toFixed(1);
    };

    const getEvalBarWidth = (evaluation: number | null, mateIn: number | null): number => {
        if (mateIn !== null) {
            return mateIn > 0 ? 100 : 0;
        }
        if (evaluation === null) return 50;
        // Scale evaluation: -500 to +500 centipawns maps to 0% to 100%
        const scaled = Math.max(-500, Math.min(500, evaluation));
        return ((scaled + 500) / 1000) * 100;
    };

    const getCurrentEval = useCallback(() => {
        // If in exploration mode, return exploration evaluation
        if (isExplorationMode) {
            return {
                evaluation: explorationEval.evaluation ?? 0,
                mateIn: explorationEval.mateIn,
                loading: explorationEval.loading,
            };
        }

        if (!analysis || currentMoveIndex === 0) return { evaluation: 0, mateIn: null, loading: false };
        const move = analysis.moves[currentMoveIndex - 1];

        // Normalize to White's perspective
        // currentMoveIndex - 1 gives us the array index (0-based)
        // Index 0, 2, 4... = White's moves (even), Index 1, 3, 5... = Black's moves (odd)
        const isBlackMove = (currentMoveIndex - 1) % 2 === 1;

        let evaluation = move?.evaluation ?? 0;
        let mateIn = move?.mateIn ?? null;

        // Flip values to White's perspective
        // The evaluation in the database (EvalAfter) is from the perspective of the side to move NEXT.
        // - After White's move (even index): Next is Black. Eval is Black's perspective. Flip it.
        // - After Black's move (odd index): Next is White. Eval is White's perspective. Keep it.
        if (!isBlackMove) {
            evaluation = -evaluation;
            if (mateIn !== null) {
                mateIn = -mateIn;
            }
        }

        return { evaluation, mateIn, loading: false };
    }, [analysis, currentMoveIndex, isExplorationMode, explorationEval]);

    const formatTimeControl = (tc: string): string => {
        if (!tc || tc === '-') return '-';
        const parts = tc.split('+');
        const baseValue = parseInt(parts[0], 10);
        if (isNaN(baseValue)) return '-';
        const minutes = baseValue >= 60 ? Math.floor(baseValue / 60) : baseValue;
        const increment = parts[1] ? parseInt(parts[1], 10) : 0;
        return `${minutes}+${increment}`;
    };

    const getAccuracyColor = (accuracy: number): string => {
        if (accuracy >= 90) return 'text-emerald-400';
        if (accuracy >= 80) return 'text-green-400';
        if (accuracy >= 70) return 'text-yellow-400';
        if (accuracy >= 60) return 'text-orange-400';
        return 'text-red-400';
    };

    // Calculate "Game Rating" based on accuracy and move quality
    // Similar to Chess.com's "You played like a XXXX" feature
    const calculateGameRating = useCallback((metrics: GameMetrics): number => {
        const { accuracy, brilliantMoves, goodMoves, inaccuracies, mistakes, blunders } = metrics;
        
        // Base rating from accuracy (mapping accuracy to rating brackets)
        // This is the core of the calculation
        let baseRating: number;
        if (accuracy >= 98) baseRating = 2800;
        else if (accuracy >= 95) baseRating = 2500;
        else if (accuracy >= 92) baseRating = 2300;
        else if (accuracy >= 90) baseRating = 2100;
        else if (accuracy >= 87) baseRating = 1900;
        else if (accuracy >= 84) baseRating = 1750;
        else if (accuracy >= 80) baseRating = 1600;
        else if (accuracy >= 75) baseRating = 1450;
        else if (accuracy >= 70) baseRating = 1300;
        else if (accuracy >= 65) baseRating = 1150;
        else if (accuracy >= 60) baseRating = 1000;
        else if (accuracy >= 55) baseRating = 900;
        else if (accuracy >= 50) baseRating = 800;
        else if (accuracy >= 40) baseRating = 650;
        else baseRating = 500;

        // Interpolate within the bracket for smoother ratings
        // E.g., 93% accuracy should be between 2300 and 2500
        const accuracyBonuses = [
            { min: 95, max: 98, low: 2500, high: 2800 },
            { min: 92, max: 95, low: 2300, high: 2500 },
            { min: 90, max: 92, low: 2100, high: 2300 },
            { min: 87, max: 90, low: 1900, high: 2100 },
            { min: 84, max: 87, low: 1750, high: 1900 },
            { min: 80, max: 84, low: 1600, high: 1750 },
            { min: 75, max: 80, low: 1450, high: 1600 },
            { min: 70, max: 75, low: 1300, high: 1450 },
            { min: 65, max: 70, low: 1150, high: 1300 },
            { min: 60, max: 65, low: 1000, high: 1150 },
        ];

        for (const bracket of accuracyBonuses) {
            if (accuracy >= bracket.min && accuracy < bracket.max) {
                const ratio = (accuracy - bracket.min) / (bracket.max - bracket.min);
                baseRating = bracket.low + ratio * (bracket.high - bracket.low);
                break;
            }
        }

        // Move quality adjustments
        // Brilliant moves significantly boost the rating
        const brilliantBonus = brilliantMoves * 75;
        
        // Good/Best moves give a small boost
        const goodBonus = goodMoves * 5;
        
        // Penalties for bad moves
        const inaccuracyPenalty = inaccuracies * 15;
        const mistakePenalty = mistakes * 40;
        const blunderPenalty = blunders * 100;

        // Calculate final rating
        let gameRating = baseRating + brilliantBonus + goodBonus - inaccuracyPenalty - mistakePenalty - blunderPenalty;

        // Clamp to reasonable bounds
        gameRating = Math.max(100, Math.min(3500, gameRating));

        return Math.round(gameRating);
    }, []);

    // Get rating description based on the calculated rating
    const getRatingDescription = (rating: number): string => {
        if (rating >= 2700) return 'Super GM';
        if (rating >= 2500) return 'Grandmaster';
        if (rating >= 2300) return 'Master';
        if (rating >= 2100) return 'Expert';
        if (rating >= 1900) return 'Class A';
        if (rating >= 1700) return 'Class B';
        if (rating >= 1500) return 'Class C';
        if (rating >= 1300) return 'Class D';
        if (rating >= 1100) return 'Class E';
        if (rating >= 900) return 'Beginner';
        return 'Novice';
    };

    // Get rating color gradient
    const getRatingColorClass = (rating: number): string => {
        if (rating >= 2500) return 'from-amber-300 via-yellow-400 to-amber-300'; // Gold for GM+
        if (rating >= 2200) return 'from-purple-300 to-violet-400'; // Purple for Master
        if (rating >= 1900) return 'from-blue-300 to-cyan-400'; // Blue for Expert
        if (rating >= 1600) return 'from-emerald-300 to-green-400'; // Green for Class A-B
        if (rating >= 1300) return 'from-lime-300 to-green-300'; // Light green
        if (rating >= 1000) return 'from-yellow-300 to-orange-300'; // Yellow-orange
        return 'from-orange-300 to-red-300'; // Orange-red for beginners
    };

    // Get moves filtered by classification category
    const getMovesByClassification = useCallback((category: string): Array<{ move: MoveAnalysis; index: number; isWhite: boolean }> => {
        if (!analysis) return [];
        
        const classificationMap: Record<string, string[]> = {
            'brilliant': ['brilliant'],
            'best_good': ['best', 'good', 'great', 'excellent'],
            'inaccuracy': ['inaccuracy'],
            'mistake': ['mistake'],
            'blunder': ['blunder'],
        };
        
        const classifications = classificationMap[category] || [];
        
        return analysis.moves
            .map((move, idx) => ({
                move,
                index: idx + 1, // 1-based index for display
                isWhite: idx % 2 === 0,
            }))
            .filter(item => classifications.includes(item.move.classification));
    }, [analysis]);

    // Toggle expanded quality category
    const toggleQualityCategory = useCallback((category: string) => {
        setExpandedQualityCategory(prev => prev === category ? null : category);
    }, []);

    // Chess.com-style Review Graph using Recharts Area Chart
    const ReviewGraph = ({ moves, currentIndex, onMoveClick }: {
        moves: MoveAnalysis[];
        currentIndex: number;
        onMoveClick: (index: number) => void;
    }) => {
        // Use ref to track container and dimensions
        const containerRef = useRef<HTMLDivElement>(null);
        const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
        
        useEffect(() => {
            const updateDimensions = () => {
                if (containerRef.current) {
                    const { width, height } = containerRef.current.getBoundingClientRect();
                    if (width > 0 && height > 0) {
                        setDimensions({ width, height });
                    }
                }
            };
            
            // Initial measurement after a short delay
            const timer = setTimeout(updateDimensions, 50);
            
            // Also listen for resize
            window.addEventListener('resize', updateDimensions);
            
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateDimensions);
            };
        }, []);
        
        // Prepare data for Recharts
        const chartData = useMemo(() => {
            // Start with equal position
            const data: Array<{
                moveIndex: number;
                moveNumber: string;
                evaluation: number;
                displayEval: string;
                playedMove: string;
                classification: string;
                isNotable: boolean;
            }> = [{
                moveIndex: 0,
                moveNumber: 'Start',
                evaluation: 0,
                displayEval: '0.0',
                playedMove: '',
                classification: '',
                isNotable: false,
            }];

            moves.forEach((move, index) => {
                // Convert centipawns to pawns, handle mate
                // IMPORTANT: Stockfish gives eval from the perspective of the side to move NEXT (EvalAfter)
                // - After White's move (even index): Next is Black. Eval is from Black's perspective. Flip it.
                // - After Black's move (odd index): Next is White. Eval is from White's perspective. Keep it.
                const isBlackMove = index % 2 === 1;

                let evalValue = 0;
                let displayEval = '0.0';

                if (move.mateIn !== null) {
                    // Mate evaluation
                    let normalizedMate = move.mateIn;
                    // Normalize to White's perspective
                    if (!isBlackMove) {
                        normalizedMate = -normalizedMate;
                    }
                    evalValue = normalizedMate > 0 ? 10 : -10; // Cap mate at ±10
                    displayEval = normalizedMate > 0 ? `M${Math.abs(move.mateIn)}` : `-M${Math.abs(move.mateIn)}`;
                } else if (move.evaluation !== null) {
                    // Centipawn evaluation - normalize to White's perspective
                    let normalizedEval = move.evaluation;
                    if (!isBlackMove) {
                        normalizedEval = -normalizedEval;
                    }
                    evalValue = Math.max(-10, Math.min(10, normalizedEval / 100)); // Clamp to ±10 pawns
                    displayEval = evalValue > 0 ? `+${evalValue.toFixed(1)}` : evalValue.toFixed(1);
                }

                const isNotable = ['brilliant', 'great', 'blunder', 'mistake', 'inaccuracy'].includes(move.classification);

                data.push({
                    moveIndex: index + 1,
                    moveNumber: `${Math.floor(index / 2) + 1}${index % 2 === 0 ? '.' : '...'}`,
                    evaluation: evalValue,
                    displayEval,
                    playedMove: move.playedMove,
                    classification: move.classification,
                    isNotable,
                });
            });

            return data;
        }, [moves]);

        // Find notable moves for dots
        const notableMoves = useMemo(() => {
            return chartData.filter(d => d.isNotable);
        }, [chartData]);

        const getClassificationColor = (classification: string): string => {
            switch (classification) {
                case 'brilliant': return '#22d3ee';
                case 'great': return '#3b82f6';
                case 'inaccuracy': return '#facc15';
                case 'mistake': return '#f97316';
                case 'blunder': return '#ef4444';
                default: return '#a1a1aa';
            }
        };

        // Custom tooltip
        const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[number] }> }) => {
            if (!active || !payload || !payload[0]) return null;

            const data = payload[0].payload;
            if (data.moveIndex === 0) return null;

            return (
                <div className="bg-zinc-800/95 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-zinc-400">{data.moveNumber}</span>
                        <span className="font-semibold text-white">{data.playedMove}</span>
                        {data.classification && (
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getClassificationColor(data.classification) }}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500">Eval:</span>
                        <span className={cn(
                            "font-mono text-sm font-bold",
                            data.evaluation > 0 ? "text-white" :
                                data.evaluation < 0 ? "text-zinc-400" : "text-zinc-300"
                        )}>
                            {data.displayEval}
                        </span>
                    </div>
                </div>
            );
        };

        // Handle chart click - using type assertion for recharts compatibility
        const handleChartClick = (data: unknown) => {
            const chartData = data as { activePayload?: Array<{ payload: { moveIndex: number } }> } | null;
            if (chartData && chartData.activePayload && chartData.activePayload[0]) {
                const moveIndex = chartData.activePayload[0].payload.moveIndex;
                if (moveIndex > 0) {
                    onMoveClick(moveIndex);
                }
            }
        };

        return (
            <div className="bg-zinc-900/95 rounded-xl border border-zinc-800/80 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
                    <span className="text-sm font-medium text-zinc-300">Evaluation Graph</span>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-white/80"></span>
                            White
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-zinc-600"></span>
                            Black
                        </span>
                    </div>
                </div>

                {/* Chart */}
                <div ref={containerRef} className="h-32 w-full px-2" style={{ minWidth: 200, minHeight: 128 }}>
                    {dimensions.width > 0 && dimensions.height > 0 ? (
                        <AreaChart
                            width={dimensions.width}
                            height={dimensions.height}
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            onClick={handleChartClick}
                        >
                            <defs>
                                <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0.05} />
                                </linearGradient>
                                <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#27272a" stopOpacity={0.05} />
                                    <stop offset="100%" stopColor="#27272a" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>

                            {/* Center reference line (equal position) */}
                            <ReferenceLine y={0} stroke="rgba(113, 113, 122, 0.4)" strokeDasharray="3 3" />

                            {/* Current move indicator */}
                            {currentIndex > 0 && (
                                <ReferenceLine
                                    x={currentIndex}
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                />
                            )}

                            <XAxis
                                dataKey="moveIndex"
                                hide
                                type="number"
                                domain={[0, 'dataMax']}
                            />
                            <YAxis
                                hide
                                domain={[-10, 10]}
                                type="number"
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                            />

                            {/* Area for positive values (white advantage) */}
                            <Area
                                type="monotone"
                                dataKey="evaluation"
                                stroke="rgba(200, 200, 210, 0.8)"
                                strokeWidth={1.5}
                                fill="url(#positiveGradient)"
                                fillOpacity={1}
                                baseValue={0}
                                isAnimationActive={false}
                            />

                            {/* Notable move markers */}
                            {notableMoves.map((move) => (
                                <ReferenceDot
                                    key={move.moveIndex}
                                    x={move.moveIndex}
                                    y={move.evaluation}
                                    r={4}
                                    fill={getClassificationColor(move.classification)}
                                    stroke="rgba(0,0,0,0.3)"
                                    strokeWidth={1}
                                />
                            ))}
                        </AreaChart>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        Brilliant
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Great
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                        Inaccuracy
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        Mistake
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Blunder
                    </span>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <RotateCw className="animate-spin h-8 w-8 text-primary" />
                <p className="text-muted-foreground">Loading analysis...</p>
            </div>
        );
    }

    if (error || !analysis) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-destructive">{error || 'Analysis not found'}</p>
                <button
                    onClick={() => navigate('/analysis')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    <ArrowLeft size={16} />
                    Back to Analysis List
                </button>
            </div>
        );
    }

    const currentEval = getCurrentEval();

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <button
                        onClick={() => navigate('/analysis')}
                        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Back to Analysis
                    </button>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Game Review</h1>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "px-2.5 py-1 rounded-md text-xs font-semibold",
                                analysis.game.platform === 'chess.com'
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-violet-500/20 text-violet-400"
                            )}>
                                {analysis.game.platform}
                            </span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-800 text-zinc-300">
                                {formatTimeControl(analysis.game.timeControl)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="text-right text-xs text-zinc-500">
                    <p>Depth {analysis.analysisDepth} • {analysis.engineVersion}</p>
                    <p>{new Date(analysis.analyzedAt).toLocaleDateString()}</p>
                </div>
            </div>

            {/* Players Bar - Enhanced with clear winner/loser indication */}
            {(() => {
                const result = analysis.game.result;
                const whiteWon = result === '1-0';
                const blackWon = result === '0-1';
                const isDraw = result === '1/2-1/2' || result === '½-½';

                // Determine termination reason from result
                const getTerminationText = () => {
                    if (whiteWon) return 'White wins';
                    if (blackWon) return 'Black wins';
                    if (isDraw) return 'Draw';
                    return 'Game over';
                };

                return (
                    <div className="bg-gradient-to-r from-zinc-900 via-zinc-800/50 to-zinc-900 rounded-xl border border-zinc-700/50 overflow-hidden">
                        {/* Result Banner */}
                        <div className={cn(
                            "px-4 py-2 text-center text-sm font-semibold",
                            whiteWon ? "bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-emerald-500/20 text-emerald-400" :
                                blackWon ? "bg-gradient-to-r from-red-500/20 via-red-500/10 to-red-500/20 text-red-400" :
                                    "bg-gradient-to-r from-zinc-500/20 via-zinc-500/10 to-zinc-500/20 text-zinc-400"
                        )}>
                            <span className="flex items-center justify-center gap-2">
                                {whiteWon && <span>🏆</span>}
                                {blackWon && <span>🏆</span>}
                                {isDraw && <span>🤝</span>}
                                {getTerminationText()} • {result}
                            </span>
                        </div>

                        {/* Players */}
                        <div className="p-4">
                            <div className="flex items-center justify-between">
                                {/* White Player */}
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-lg flex items-center justify-center shadow-lg relative",
                                        whiteWon
                                            ? "bg-gradient-to-br from-yellow-200 to-yellow-400 ring-2 ring-yellow-400/50"
                                            : "bg-gradient-to-br from-zinc-100 to-zinc-300"
                                    )}>
                                        <span className="text-zinc-800 font-bold text-xl">♔</span>
                                        {whiteWon && (
                                            <span className="absolute -top-1 -right-1 text-sm">👑</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={cn(
                                                "font-bold",
                                                whiteWon ? "text-emerald-400" : blackWon ? "text-zinc-400" : "text-white"
                                            )}>
                                                {analysis.game.whitePlayer}
                                            </p>
                                            {whiteWon && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400">
                                                    WON
                                                </span>
                                            )}
                                            {blackWon && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-400">
                                                    LOST
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "text-sm font-bold",
                                                getAccuracyColor(analysis.whiteMetrics.accuracy)
                                            )}>
                                                {analysis.whiteMetrics.accuracy.toFixed(1)}%
                                            </div>
                                            <span className="text-xs text-zinc-500">accuracy</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Result Badge */}
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className={cn(
                                        "px-6 py-3 rounded-xl border shadow-lg",
                                        whiteWon ? "bg-emerald-500/10 border-emerald-500/30" :
                                            blackWon ? "bg-red-500/10 border-red-500/30" :
                                                "bg-zinc-800 border-zinc-700"
                                    )}>
                                        <span className={cn(
                                            "font-bold text-2xl tracking-widest",
                                            whiteWon ? "text-emerald-400" :
                                                blackWon ? "text-red-400" :
                                                    "text-white"
                                        )}>
                                            {result}
                                        </span>
                                    </div>
                                    {analysis.game.openingName && (
                                        <span className="text-xs text-zinc-500 max-w-[200px] truncate text-center">
                                            {analysis.game.openingName}
                                        </span>
                                    )}
                                </div>

                                {/* Black Player */}
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {blackWon && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400">
                                                    WON
                                                </span>
                                            )}
                                            {whiteWon && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-400">
                                                    LOST
                                                </span>
                                            )}
                                            <p className={cn(
                                                "font-bold",
                                                blackWon ? "text-emerald-400" : whiteWon ? "text-zinc-400" : "text-white"
                                            )}>
                                                {analysis.game.blackPlayer}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-xs text-zinc-500">accuracy</span>
                                            <div className={cn(
                                                "text-sm font-bold",
                                                getAccuracyColor(analysis.blackMetrics.accuracy)
                                            )}>
                                                {analysis.blackMetrics.accuracy.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-12 h-12 rounded-lg flex items-center justify-center shadow-lg border relative",
                                        blackWon
                                            ? "bg-gradient-to-br from-zinc-600 to-zinc-800 ring-2 ring-yellow-400/50 border-yellow-400/30"
                                            : "bg-gradient-to-br from-zinc-700 to-zinc-900 border-zinc-600"
                                    )}>
                                        <span className="text-zinc-200 font-bold text-xl">♚</span>
                                        {blackWon && (
                                            <span className="absolute -top-1 -right-1 text-sm">👑</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Review Graph */}
            <ReviewGraph
                moves={analysis.moves}
                currentIndex={currentMoveIndex}
                onMoveClick={goToMoveWithReset}
            />

            {/* Win Probability + Key Moments Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Win Probability */}
                {(() => {
                    const winProb = calculateWinProbability(currentEval.evaluation, currentEval.mateIn);
                    return (
                        <div className="bg-zinc-900/95 rounded-xl border border-zinc-800/80 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-zinc-300">Win Probability</span>
                                <span className="text-xs text-zinc-500">
                                    Move {currentMoveIndex}/{analysis.moves.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Probability Bar */}
                                <div className="flex-1 h-6 rounded-lg overflow-hidden flex">
                                    <div 
                                        className="bg-gradient-to-r from-zinc-100 to-zinc-200 transition-all duration-300 flex items-center justify-center"
                                        style={{ width: `${winProb.white}%` }}
                                    >
                                        {winProb.white > 15 && (
                                            <span className="text-xs font-bold text-zinc-800">{winProb.white}%</span>
                                        )}
                                    </div>
                                    {winProb.draw > 5 && (
                                        <div 
                                            className="bg-zinc-500 transition-all duration-300 flex items-center justify-center"
                                            style={{ width: `${winProb.draw}%` }}
                                        >
                                            {winProb.draw > 10 && (
                                                <span className="text-xs font-bold text-white">{winProb.draw}%</span>
                                            )}
                                        </div>
                                    )}
                                    <div 
                                        className="bg-gradient-to-r from-zinc-700 to-zinc-800 transition-all duration-300 flex items-center justify-center flex-1"
                                        style={{ width: `${winProb.black}%` }}
                                    >
                                        {winProb.black > 15 && (
                                            <span className="text-xs font-bold text-zinc-200">{winProb.black}%</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] text-zinc-500">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-sm bg-zinc-200"></span>
                                    White
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-sm bg-zinc-500"></span>
                                    Draw
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-sm bg-zinc-700"></span>
                                    Black
                                </span>
                            </div>
                        </div>
                    );
                })()}

                {/* Key Moments */}
                <div className="bg-zinc-900/95 rounded-xl border border-zinc-800/80 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Crosshair className="h-4 w-4 text-rose-400" />
                        <span className="text-sm font-medium text-zinc-300">Key Moments</span>
                    </div>
                    {keyMoments.length > 0 ? (
                        <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                            {keyMoments.map((moment, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => goToMoveWithReset(moment.moveIndex)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all text-left",
                                        currentMoveIndex === moment.moveIndex
                                            ? "bg-rose-500/20 ring-1 ring-rose-500/50"
                                            : "hover:bg-zinc-800/50"
                                    )}
                                >
                                    <span className={cn(
                                        "w-5 h-5 rounded flex items-center justify-center flex-shrink-0",
                                        moment.type === 'blunder' ? "bg-red-500/20" :
                                        moment.type === 'mistake' ? "bg-orange-500/20" :
                                        moment.type === 'brilliant' ? "bg-cyan-500/20" :
                                        "bg-rose-500/20"
                                    )}>
                                        {moment.type === 'blunder' ? <XCircle className="h-3 w-3 text-red-400" /> :
                                         moment.type === 'mistake' ? <AlertTriangle className="h-3 w-3 text-orange-400" /> :
                                         moment.type === 'brilliant' ? <Star className="h-3 w-3 text-cyan-400" /> :
                                         <Zap className="h-3 w-3 text-rose-400" />}
                                    </span>
                                    <span className="flex-1 text-zinc-400 truncate">{moment.description}</span>
                                    <span className="text-zinc-600 font-mono">#{moment.moveIndex}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-500 text-center py-3">
                            No critical moments detected in this game
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Panel: Board & Controls */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Vertical Evaluation Bar + Board */}
                    <div className="flex gap-2">
                        {/* Vertical Eval Bar */}
                        <div className={cn(
                            "w-6 flex-shrink-0 relative rounded-lg overflow-hidden shadow-inner transition-all",
                            isExplorationMode ? "bg-amber-900/50" : "bg-zinc-800"
                        )}>
                            <div
                                className={cn(
                                    "absolute bottom-0 left-0 right-0 transition-all duration-300 ease-out",
                                    isExplorationMode
                                        ? "bg-gradient-to-t from-amber-200 to-amber-100"
                                        : "bg-gradient-to-t from-zinc-100 to-white"
                                )}
                                style={{ height: `${getEvalBarWidth(currentEval.evaluation, currentEval.mateIn)}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                {currentEval.loading ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                                ) : (
                                    <span
                                        className={cn(
                                            "text-[10px] font-bold px-0.5 py-0.5 rounded writing-mode-vertical transform rotate-180",
                                            (currentEval.evaluation ?? 0) >= 0 ? "text-zinc-800" : "text-zinc-200"
                                        )}
                                        style={{ writingMode: 'vertical-rl' }}
                                    >
                                        {formatEval(currentEval.evaluation, currentEval.mateIn)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Chessboard */}
                        <div className={cn(
                            "flex-1 rounded-xl overflow-hidden shadow-2xl border transition-all",
                            isExplorationMode
                                ? "border-amber-500/50 ring-2 ring-amber-500/30"
                                : "border-zinc-700/50"
                        )}>
                            <ChessBoardViewer
                                fen={currentFen}
                                interactive={true}
                                bestMove={currentMoveData.bestMove}
                                lastMove={currentMoveData.lastMove}
                                destinationSquare={currentMoveData.destinationSquare}
                                classification={currentMoveData.classification}
                                boardOrientation={boardOrientation}
                                onMove={handleExplorationMove}
                            />
                        </div>
                    </div>

                    {/* Exploration Mode Indicator */}
                    {isExplorationMode && (
                        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 rounded-xl p-3 border border-amber-500/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4 text-amber-400" />
                                    <span className="text-sm font-medium text-amber-400">Exploration Mode</span>
                                    <span className="text-xs text-amber-400/70">
                                        (from move {explorationStartIndex})
                                    </span>
                                </div>
                                <button
                                    onClick={resetExploration}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Undo2 className="h-3.5 w-3.5" />
                                    Reset to Game
                                </button>
                            </div>
                            <p className="text-xs text-amber-400/60 mt-2">
                                Move any piece to analyze alternative lines. Press Esc or click Reset to return.
                            </p>
                        </div>
                    )}

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-center gap-2 bg-zinc-900/50 rounded-xl p-3 border border-zinc-700/30">
                        {/* Flip Board Button */}
                        <button
                            onClick={flipBoard}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                            title="Flip board"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>

                        <div className="w-px h-6 bg-zinc-700 mx-1"></div>

                        <button
                            onClick={() => goToMoveWithReset(0)}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={currentMoveIndex === 0 && !isExplorationMode}
                            title="Go to start (Home)"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => goToMoveWithReset(currentMoveIndex - 1)}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={currentMoveIndex === 0 && !isExplorationMode}
                            title="Previous move (←)"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className={cn(
                            "px-4 py-1.5 rounded-lg min-w-[100px] text-center border",
                            isExplorationMode
                                ? "bg-amber-500/10 border-amber-500/30"
                                : "bg-zinc-800 border-zinc-700/50"
                        )}>
                            <span className="text-xs text-zinc-500">Move</span>
                            <span className={cn(
                                "ml-2 font-bold tabular-nums",
                                isExplorationMode ? "text-amber-400" : ""
                            )}>
                                {isExplorationMode ? `${explorationStartIndex}*` : `${currentMoveIndex}/${analysis.moves.length}`}
                            </span>
                        </div>
                        <button
                            onClick={() => goToMoveWithReset(currentMoveIndex + 1)}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={(currentMoveIndex >= analysis.moves.length && !isExplorationMode)}
                            title="Next move (→)"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => goToMoveWithReset(analysis.moves.length)}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={(currentMoveIndex >= analysis.moves.length && !isExplorationMode)}
                            title="Go to end (End)"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </button>

                        <div className="w-px h-6 bg-zinc-700 mx-1"></div>

                        {/* Copy FEN Button */}
                        <button
                            onClick={copyFenToClipboard}
                            className={cn(
                                "p-2 rounded-lg transition-colors flex items-center gap-1.5",
                                fenCopied
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-zinc-800 hover:bg-zinc-700"
                            )}
                            title="Copy FEN to clipboard"
                        >
                            {fenCopied ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Middle Panel: Current Move Card + Move List */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Current Move Card */}
                    {isExplorationMode ? (
                        /* Exploration Mode Card */
                        <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 rounded-xl p-4 border border-amber-500/30 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4 text-amber-400" />
                                    Exploring Position
                                </h3>
                                {explorationEval.loading && (
                                    <span className="flex items-center gap-1.5 text-xs text-amber-400/70">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Analyzing...
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                                    <span className="text-xs text-amber-400/70 block mb-1">Position Eval</span>
                                    <span className={cn(
                                        "font-mono font-bold text-lg",
                                        explorationEval.loading ? "text-amber-400/50" :
                                            (currentEval.evaluation ?? 0) >= 0 ? "text-amber-200" : "text-amber-400"
                                    )}>
                                        {explorationEval.loading ? '...' : formatEval(currentEval.evaluation, currentEval.mateIn)}
                                    </span>
                                </div>
                                <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                                    <span className="text-xs text-amber-400/70 block mb-1">Best Move</span>
                                    <span className="font-mono font-bold text-lg text-emerald-400">
                                        {explorationEval.loading ? '...' : (explorationEval.bestMove || '-')}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-amber-400/50 mt-3 pt-3 border-t border-amber-500/20">
                                Continue moving pieces to explore deeper lines
                            </p>
                        </div>
                    ) : currentMoveIndex > 0 && analysis.moves[currentMoveIndex - 1] && (
                        /* Standard Move Card */
                        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                    <Target className="h-4 w-4 text-blue-400" />
                                    Move {currentMoveIndex}
                                </h3>
                                <span className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                                    getClassificationColor(analysis.moves[currentMoveIndex - 1].classification)
                                )}>
                                    {getClassificationIcon(analysis.moves[currentMoveIndex - 1].classification)}
                                    {analysis.moves[currentMoveIndex - 1].classification.charAt(0).toUpperCase() +
                                        analysis.moves[currentMoveIndex - 1].classification.slice(1)}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
                                    <span className="text-xs text-zinc-500 block mb-1">Played</span>
                                    <span className="font-mono font-bold text-lg text-white">
                                        {analysis.moves[currentMoveIndex - 1].playedMove}
                                    </span>
                                </div>
                                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
                                    <span className="text-xs text-zinc-500 block mb-1">Best</span>
                                    <span className="font-mono font-bold text-lg text-emerald-400">
                                        {analysis.moves[currentMoveIndex - 1].bestMove}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-700/30">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-500">Eval:</span>
                                    <span className={cn(
                                        "font-mono font-bold",
                                        (currentEval.evaluation ?? 0) >= 0 ? "text-zinc-200" : "text-zinc-400"
                                    )}>
                                        {formatEval(currentEval.evaluation, currentEval.mateIn)}
                                    </span>
                                </div>
                                {analysis.moves[currentMoveIndex - 1].centipawnLoss !== null &&
                                    analysis.moves[currentMoveIndex - 1].centipawnLoss! > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-zinc-500">CP Loss:</span>
                                            <span className="font-mono font-bold text-orange-400">
                                                -{analysis.moves[currentMoveIndex - 1].centipawnLoss}
                                            </span>
                                        </div>
                                    )}
                            </div>

                            {/* Engine Line (PV) */}
                            {analysis.moves[currentMoveIndex - 1].pv && analysis.moves[currentMoveIndex - 1].pv.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-zinc-700/30">
                                    <span className="text-xs text-zinc-500 block mb-1.5">Best Line:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {analysis.moves[currentMoveIndex - 1].pv.slice(0, 6).map((move, idx) => (
                                            <span 
                                                key={idx} 
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded text-xs font-mono",
                                                    idx === 0 
                                                        ? "bg-emerald-500/20 text-emerald-400 font-semibold" 
                                                        : "bg-zinc-700/50 text-zinc-400"
                                                )}
                                            >
                                                {move}
                                            </span>
                                        ))}
                                        {analysis.moves[currentMoveIndex - 1].pv.length > 6 && (
                                            <span className="text-xs text-zinc-500">...</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Move List */}
                    <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/50 rounded-xl border border-zinc-700/50 backdrop-blur-sm">
                        <div className="flex items-center gap-2 p-4 border-b border-zinc-700/50">
                            <BookOpen className="h-4 w-4 text-amber-400" />
                            <h3 className="text-sm font-semibold text-zinc-300">Move List</h3>
                            <span className="text-xs text-zinc-500 ml-auto">{analysis.moves.length} moves</span>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto p-2 custom-scrollbar">
                            <div className="space-y-0.5">
                                {Array.from({ length: Math.ceil(analysis.moves.length / 2) }).map((_, rowIndex) => {
                                    const whiteMove = analysis.moves[rowIndex * 2];
                                    const blackMove = analysis.moves[rowIndex * 2 + 1];
                                    const moveNum = rowIndex + 1;

                                    return (
                                        <div key={rowIndex} className="flex items-stretch gap-0.5">
                                            {/* Move number */}
                                            <div className="w-8 flex items-center justify-center text-xs text-zinc-600 font-medium">
                                                {moveNum}.
                                            </div>

                                            {/* White's move */}
                                            <button
                                                onClick={() => goToMoveWithReset(rowIndex * 2 + 1)}
                                                className={cn(
                                                    "flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-all",
                                                    currentMoveIndex === rowIndex * 2 + 1 && !isExplorationMode
                                                        ? "bg-emerald-500/20 ring-1 ring-emerald-500/50"
                                                        : "hover:bg-zinc-700/50"
                                                )}
                                            >
                                                <span className="w-4 flex-shrink-0">
                                                    {getClassificationIcon(whiteMove?.classification || 'normal')}
                                                </span>
                                                <span className={cn(
                                                    "font-mono text-xs",
                                                    currentMoveIndex === rowIndex * 2 + 1 && !isExplorationMode ? "text-white font-bold" : "text-zinc-300"
                                                )}>
                                                    {whiteMove?.playedMove || '-'}
                                                </span>
                                            </button>

                                            {/* Black's move */}
                                            {blackMove ? (
                                                <button
                                                    onClick={() => goToMoveWithReset(rowIndex * 2 + 2)}
                                                    className={cn(
                                                        "flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-all",
                                                        currentMoveIndex === rowIndex * 2 + 2 && !isExplorationMode
                                                            ? "bg-emerald-500/20 ring-1 ring-emerald-500/50"
                                                            : "hover:bg-zinc-700/50"
                                                    )}
                                                >
                                                    <span className="w-4 flex-shrink-0">
                                                        {getClassificationIcon(blackMove.classification)}
                                                    </span>
                                                    <span className={cn(
                                                        "font-mono text-xs",
                                                        currentMoveIndex === rowIndex * 2 + 2 && !isExplorationMode ? "text-white font-bold" : "text-zinc-300"
                                                    )}>
                                                        {blackMove.playedMove}
                                                    </span>
                                                </button>
                                            ) : (
                                                <div className="flex-1" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Metrics */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Move Quality Summary */}
                    <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 backdrop-blur-sm">
                        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Move Quality</h3>

                        <div className="space-y-1">
                            {/* Brilliant */}
                            {(analysis.whiteMetrics.brilliantMoves > 0 || analysis.blackMetrics.brilliantMoves > 0) && (
                                <div>
                                    <button
                                        onClick={() => toggleQualityCategory('brilliant')}
                                        className={cn(
                                            "w-full flex items-center justify-between py-2 px-2 rounded-lg transition-all",
                                            expandedQualityCategory === 'brilliant'
                                                ? "bg-cyan-500/10 border border-cyan-500/30"
                                                : "hover:bg-zinc-800/50 border border-transparent"
                                        )}
                                    >
                                        <span className="flex items-center gap-2 text-xs">
                                            <Star className="h-3.5 w-3.5 text-cyan-400" />
                                            <span className="text-cyan-400">Brilliant</span>
                                            <ChevronDown className={cn(
                                                "h-3 w-3 text-cyan-400/50 transition-transform",
                                                expandedQualityCategory === 'brilliant' && "rotate-180"
                                            )} />
                                        </span>
                                        <div className="flex items-center gap-3 text-xs font-mono">
                                            <span className="text-zinc-300">{analysis.whiteMetrics.brilliantMoves}</span>
                                            <span className="text-zinc-600">|</span>
                                            <span className="text-zinc-300">{analysis.blackMetrics.brilliantMoves}</span>
                                        </div>
                                    </button>
                                    {expandedQualityCategory === 'brilliant' && (
                                        <div className="mt-1 ml-6 space-y-0.5 max-h-32 overflow-y-auto custom-scrollbar">
                                            {getMovesByClassification('brilliant').map(({ move, index, isWhite }) => (
                                                <button
                                                    key={index}
                                                    onClick={() => goToMoveWithReset(index)}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-all",
                                                        currentMoveIndex === index
                                                            ? "bg-cyan-500/20 text-cyan-300"
                                                            : "hover:bg-zinc-800/50 text-zinc-400"
                                                    )}
                                                >
                                                    <span className={cn("w-2 h-2 rounded", isWhite ? "bg-zinc-200" : "bg-zinc-600")} />
                                                    <span className="text-zinc-500">{Math.ceil(index / 2)}{isWhite ? '.' : '...'}</span>
                                                    <span className="font-mono">{move.playedMove}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Best/Good */}
                            <div>
                                <button
                                    onClick={() => toggleQualityCategory('best_good')}
                                    className={cn(
                                        "w-full flex items-center justify-between py-2 px-2 rounded-lg transition-all",
                                        expandedQualityCategory === 'best_good'
                                            ? "bg-green-500/10 border border-green-500/30"
                                            : "hover:bg-zinc-800/50 border border-transparent"
                                    )}
                                >
                                    <span className="flex items-center gap-2 text-xs">
                                        <Check className="h-3.5 w-3.5 text-green-400" />
                                        <span className="text-green-400">Best/Good</span>
                                        <ChevronDown className={cn(
                                            "h-3 w-3 text-green-400/50 transition-transform",
                                            expandedQualityCategory === 'best_good' && "rotate-180"
                                        )} />
                                    </span>
                                    <div className="flex items-center gap-3 text-xs font-mono">
                                        <span className="text-zinc-300">{analysis.whiteMetrics.goodMoves}</span>
                                        <span className="text-zinc-600">|</span>
                                        <span className="text-zinc-300">{analysis.blackMetrics.goodMoves}</span>
                                    </div>
                                </button>
                                {expandedQualityCategory === 'best_good' && (
                                    <div className="mt-1 ml-6 space-y-0.5 max-h-32 overflow-y-auto custom-scrollbar">
                                        {getMovesByClassification('best_good').map(({ move, index, isWhite }) => (
                                            <button
                                                key={index}
                                                onClick={() => goToMoveWithReset(index)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-all",
                                                    currentMoveIndex === index
                                                        ? "bg-green-500/20 text-green-300"
                                                        : "hover:bg-zinc-800/50 text-zinc-400"
                                                )}
                                            >
                                                <span className={cn("w-2 h-2 rounded", isWhite ? "bg-zinc-200" : "bg-zinc-600")} />
                                                <span className="text-zinc-500">{Math.ceil(index / 2)}{isWhite ? '.' : '...'}</span>
                                                <span className="font-mono">{move.playedMove}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Inaccuracies */}
                            <div>
                                <button
                                    onClick={() => toggleQualityCategory('inaccuracy')}
                                    className={cn(
                                        "w-full flex items-center justify-between py-2 px-2 rounded-lg transition-all",
                                        expandedQualityCategory === 'inaccuracy'
                                            ? "bg-yellow-500/10 border border-yellow-500/30"
                                            : "hover:bg-zinc-800/50 border border-transparent"
                                    )}
                                >
                                    <span className="flex items-center gap-2 text-xs">
                                        <MinusCircle className="h-3.5 w-3.5 text-yellow-400" />
                                        <span className="text-yellow-400">Inaccuracies</span>
                                        <ChevronDown className={cn(
                                            "h-3 w-3 text-yellow-400/50 transition-transform",
                                            expandedQualityCategory === 'inaccuracy' && "rotate-180"
                                        )} />
                                    </span>
                                    <div className="flex items-center gap-3 text-xs font-mono">
                                        <span className="text-zinc-300">{analysis.whiteMetrics.inaccuracies}</span>
                                        <span className="text-zinc-600">|</span>
                                        <span className="text-zinc-300">{analysis.blackMetrics.inaccuracies}</span>
                                    </div>
                                </button>
                                {expandedQualityCategory === 'inaccuracy' && (
                                    <div className="mt-1 ml-6 space-y-0.5 max-h-32 overflow-y-auto custom-scrollbar">
                                        {getMovesByClassification('inaccuracy').map(({ move, index, isWhite }) => (
                                            <button
                                                key={index}
                                                onClick={() => goToMoveWithReset(index)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-all",
                                                    currentMoveIndex === index
                                                        ? "bg-yellow-500/20 text-yellow-300"
                                                        : "hover:bg-zinc-800/50 text-zinc-400"
                                                )}
                                            >
                                                <span className={cn("w-2 h-2 rounded", isWhite ? "bg-zinc-200" : "bg-zinc-600")} />
                                                <span className="text-zinc-500">{Math.ceil(index / 2)}{isWhite ? '.' : '...'}</span>
                                                <span className="font-mono">{move.playedMove}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Mistakes */}
                            <div>
                                <button
                                    onClick={() => toggleQualityCategory('mistake')}
                                    className={cn(
                                        "w-full flex items-center justify-between py-2 px-2 rounded-lg transition-all",
                                        expandedQualityCategory === 'mistake'
                                            ? "bg-orange-500/10 border border-orange-500/30"
                                            : "hover:bg-zinc-800/50 border border-transparent"
                                    )}
                                >
                                    <span className="flex items-center gap-2 text-xs">
                                        <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                                        <span className="text-orange-400">Mistakes</span>
                                        <ChevronDown className={cn(
                                            "h-3 w-3 text-orange-400/50 transition-transform",
                                            expandedQualityCategory === 'mistake' && "rotate-180"
                                        )} />
                                    </span>
                                    <div className="flex items-center gap-3 text-xs font-mono">
                                        <span className="text-zinc-300">{analysis.whiteMetrics.mistakes}</span>
                                        <span className="text-zinc-600">|</span>
                                        <span className="text-zinc-300">{analysis.blackMetrics.mistakes}</span>
                                    </div>
                                </button>
                                {expandedQualityCategory === 'mistake' && (
                                    <div className="mt-1 ml-6 space-y-0.5 max-h-32 overflow-y-auto custom-scrollbar">
                                        {getMovesByClassification('mistake').map(({ move, index, isWhite }) => (
                                            <button
                                                key={index}
                                                onClick={() => goToMoveWithReset(index)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-all",
                                                    currentMoveIndex === index
                                                        ? "bg-orange-500/20 text-orange-300"
                                                        : "hover:bg-zinc-800/50 text-zinc-400"
                                                )}
                                            >
                                                <span className={cn("w-2 h-2 rounded", isWhite ? "bg-zinc-200" : "bg-zinc-600")} />
                                                <span className="text-zinc-500">{Math.ceil(index / 2)}{isWhite ? '.' : '...'}</span>
                                                <span className="font-mono">{move.playedMove}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Blunders */}
                            <div>
                                <button
                                    onClick={() => toggleQualityCategory('blunder')}
                                    className={cn(
                                        "w-full flex items-center justify-between py-2 px-2 rounded-lg transition-all",
                                        expandedQualityCategory === 'blunder'
                                            ? "bg-red-500/10 border border-red-500/30"
                                            : "hover:bg-zinc-800/50 border border-transparent"
                                    )}
                                >
                                    <span className="flex items-center gap-2 text-xs">
                                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                                        <span className="text-red-400">Blunders</span>
                                        <ChevronDown className={cn(
                                            "h-3 w-3 text-red-400/50 transition-transform",
                                            expandedQualityCategory === 'blunder' && "rotate-180"
                                        )} />
                                    </span>
                                    <div className="flex items-center gap-3 text-xs font-mono">
                                        <span className="text-zinc-300">{analysis.whiteMetrics.blunders}</span>
                                        <span className="text-zinc-600">|</span>
                                        <span className="text-zinc-300">{analysis.blackMetrics.blunders}</span>
                                    </div>
                                </button>
                                {expandedQualityCategory === 'blunder' && (
                                    <div className="mt-1 ml-6 space-y-0.5 max-h-32 overflow-y-auto custom-scrollbar">
                                        {getMovesByClassification('blunder').map(({ move, index, isWhite }) => (
                                            <button
                                                key={index}
                                                onClick={() => goToMoveWithReset(index)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-all",
                                                    currentMoveIndex === index
                                                        ? "bg-red-500/20 text-red-300"
                                                        : "hover:bg-zinc-800/50 text-zinc-400"
                                                )}
                                            >
                                                <span className={cn("w-2 h-2 rounded", isWhite ? "bg-zinc-200" : "bg-zinc-600")} />
                                                <span className="text-zinc-500">{Math.ceil(index / 2)}{isWhite ? '.' : '...'}</span>
                                                <span className="font-mono">{move.playedMove}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-end gap-4 mt-3 pt-3 border-t border-zinc-700/30 text-[10px] text-zinc-500">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded bg-zinc-200"></span>
                                White
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded bg-zinc-600"></span>
                                Black
                            </span>
                        </div>
                    </div>

                    {/* Game Rating - "You played like a XXXX" */}
                    {(() => {
                        const whiteGameRating = calculateGameRating(analysis.whiteMetrics);
                        const blackGameRating = calculateGameRating(analysis.blackMetrics);
                        
                        return (
                            <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 rounded-xl p-4 border border-indigo-500/30 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                                    <h3 className="text-xs font-semibold text-indigo-300">Game Rating</h3>
                                </div>
                                
                                <div className="flex gap-3">
                                    {/* White Game Rating */}
                                    <div className="flex-1 bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30 text-center">
                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                            <span className="w-2.5 h-2.5 rounded bg-zinc-100 shadow-sm"></span>
                                            <span className="text-[10px] text-zinc-400 truncate max-w-[60px]">{analysis.game.whitePlayer.split(' ')[0]}</span>
                                        </div>
                                        <span className={cn(
                                            "text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent block",
                                            getRatingColorClass(whiteGameRating)
                                        )}>
                                            {whiteGameRating}
                                        </span>
                                        <span className="text-[9px] text-zinc-500">{getRatingDescription(whiteGameRating)}</span>
                                    </div>
                                    
                                    {/* Black Game Rating */}
                                    <div className="flex-1 bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30 text-center">
                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                            <span className="w-2.5 h-2.5 rounded bg-zinc-600 border border-zinc-500 shadow-sm"></span>
                                            <span className="text-[10px] text-zinc-400 truncate max-w-[60px]">{analysis.game.blackPlayer.split(' ')[0]}</span>
                                        </div>
                                        <span className={cn(
                                            "text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent block",
                                            getRatingColorClass(blackGameRating)
                                        )}>
                                            {blackGameRating}
                                        </span>
                                        <span className="text-[9px] text-zinc-500">{getRatingDescription(blackGameRating)}</span>
                                    </div>
                                </div>
                                
                                <p className="text-[9px] text-indigo-400/50 text-center mt-2">
                                    Based on accuracy &amp; move quality
                                </p>
                            </div>
                        );
                    })()}

                    {/* ACPL */}
                    <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 backdrop-blur-sm">
                        <h3 className="text-xs font-semibold text-zinc-400 mb-3">Average Centipawn Loss</h3>
                        <div className="flex items-center justify-between">
                            <div className="text-center">
                                <span className="text-2xl font-bold text-zinc-200">{analysis.whiteMetrics.acpl.toFixed(0)}</span>
                                <span className="text-xs text-zinc-500 block">White</span>
                            </div>
                            <div className="h-8 w-px bg-zinc-700"></div>
                            <div className="text-center">
                                <span className="text-2xl font-bold text-zinc-200">{analysis.blackMetrics.acpl.toFixed(0)}</span>
                                <span className="text-xs text-zinc-500 block">Black</span>
                            </div>
                        </div>
                    </div>

                    {/* Time Analysis */}
                    {timeAnalysis && timeAnalysis.hasData ? (
                        <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/10 rounded-xl p-4 border border-blue-500/30 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="h-4 w-4 text-blue-400" />
                                <h3 className="text-xs font-semibold text-blue-300">Time Analysis</h3>
                            </div>
                            
                            <div className="space-y-3">
                                {/* White Time Stats */}
                                <div className="bg-zinc-800/50 rounded-lg p-2.5 border border-zinc-700/30">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded bg-zinc-200"></span>
                                            {analysis.game.whitePlayer.split(' ')[0]}
                                        </span>
                                        <span className="text-xs font-mono text-blue-300">
                                            Total: {formatTime(timeAnalysis.white.total)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-zinc-500">
                                            Avg: <span className="text-zinc-300 font-mono">{formatTime(timeAnalysis.white.avg)}</span>
                                        </span>
                                        <span className="text-zinc-500">
                                            Max: <span className="text-orange-400 font-mono">{formatTime(timeAnalysis.white.max)}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Black Time Stats */}
                                <div className="bg-zinc-800/50 rounded-lg p-2.5 border border-zinc-700/30">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded bg-zinc-600"></span>
                                            {analysis.game.blackPlayer.split(' ')[0]}
                                        </span>
                                        <span className="text-xs font-mono text-blue-300">
                                            Total: {formatTime(timeAnalysis.black.total)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-zinc-500">
                                            Avg: <span className="text-zinc-300 font-mono">{formatTime(timeAnalysis.black.avg)}</span>
                                        </span>
                                        <span className="text-zinc-500">
                                            Max: <span className="text-orange-400 font-mono">{formatTime(timeAnalysis.black.max)}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Current Move Time */}
                                {currentMoveIndex > 0 && analysis.moves[currentMoveIndex - 1]?.timeSpent && (
                                    <div className="pt-2 border-t border-blue-500/20">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-zinc-500">Move {currentMoveIndex} time:</span>
                                            <span className="text-sm font-mono font-bold text-blue-300">
                                                {formatTime(analysis.moves[currentMoveIndex - 1].timeSpent!)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 rounded-xl p-4 border border-zinc-700/30 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-4 w-4 text-zinc-500" />
                                <h3 className="text-xs font-semibold text-zinc-500">Time Analysis</h3>
                            </div>
                            <p className="text-[10px] text-zinc-600 text-center py-2">
                                Time data not available for this game
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AnalysisViewer;
