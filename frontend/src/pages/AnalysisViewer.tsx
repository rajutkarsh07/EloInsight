import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCw, AlertTriangle, XCircle, MinusCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Star, Zap, Check, ArrowLeft, Target, BookOpen, Sparkles, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import ChessBoardViewer from '../components/chess/ChessBoardViewer';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface MoveAnalysis {
    moveNumber: number;
    halfMove: number;
    fen: string;
    evaluation: number | null;
    mateIn: number | null;
    bestMove: string;
    bestMoveUci?: string | null; // UCI format for arrow display
    playedMove: string;
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
}

// Extract destination square from SAN notation (e.g., "Nf3" -> "f3", "e4" -> "e4", "Qxd5" -> "d5")
const extractDestinationSquare = (san: string): string | undefined => {
    if (!san) return undefined;
    // Remove check/checkmate symbols and promotion
    const cleaned = san.replace(/[+#=QRBN]$/g, '').replace(/[+#]/g, '');
    // Match the last two characters that form a valid square (letter a-h + number 1-8)
    const match = cleaned.match(/([a-h][1-8])$/);
    return match ? match[1] : undefined;
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
                console.log('📊 Review Graph Data:', {
                    totalMoves: data.moves.length,
                    sampleMoves: data.moves.slice(0, 5).map(m => ({
                        halfMove: m.halfMove,
                        playedMove: m.playedMove,
                        evaluation: m.evaluation,
                        mateIn: m.mateIn,
                        classification: m.classification,
                    })),
                    allEvaluations: data.moves.map(m => m.evaluation),
                });
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

    const goToMove = useCallback((index: number) => {
        if (!analysis) return;
        const maxIndex = analysis.moves.length;
        setCurrentMoveIndex(Math.max(0, Math.min(index, maxIndex)));
    }, [analysis]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            goToMove(currentMoveIndex - 1);
        } else if (e.key === 'ArrowRight') {
            goToMove(currentMoveIndex + 1);
        } else if (e.key === 'Home') {
            goToMove(0);
        } else if (e.key === 'End' && analysis) {
            goToMove(analysis.moves.length);
        }
    }, [currentMoveIndex, goToMove, analysis]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const currentFen = useMemo(() => {
        const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        if (!analysis || currentMoveIndex === 0) return startingFen;

        const move = analysis.moves[currentMoveIndex - 1];
        const fen = move?.fen;

        if (fen && typeof fen === 'string' && fen.trim().length > 0) {
            return fen;
        }

        // Fallback: if FEN is not available, keep the starting position
        console.warn('FEN not available for move', currentMoveIndex);
        return startingFen;
    }, [analysis, currentMoveIndex]);

    // Valid classification types for the ChessBoardViewer
    type BoardClassification = 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'book' | 'normal' | 'inaccuracy' | 'mistake' | 'blunder' | null;

    // Compute current move data for board visualization
    const currentMoveData = useMemo((): {
        bestMove: string | undefined;
        lastMove: string | undefined;
        classification: BoardClassification;
        destinationSquare: string | undefined;
    } => {
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

        return {
            bestMove: bestMoveUci,
            lastMove: undefined,
            classification,
            destinationSquare,
        };
    }, [analysis, currentMoveIndex]);

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

    const getCurrentEval = () => {
        if (!analysis || currentMoveIndex === 0) return { evaluation: 0, mateIn: null };
        const move = analysis.moves[currentMoveIndex - 1];

        // Normalize to White's perspective
        // currentMoveIndex - 1 gives us the array index (0-based)
        // Index 0, 2, 4... = White's moves (even), Index 1, 3, 5... = Black's moves (odd)
        const isBlackMove = (currentMoveIndex - 1) % 2 === 1;

        let evaluation = move?.evaluation ?? 0;
        let mateIn = move?.mateIn ?? null;

        // Flip values to White's perspective if it was Black's move
        if (isBlackMove) {
            evaluation = -evaluation;
            if (mateIn !== null) {
                mateIn = -mateIn;
            }
        }

        return { evaluation, mateIn };
    };

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

    // Chess.com-style Review Graph using Recharts Area Chart
    const ReviewGraph = ({ moves, currentIndex, onMoveClick }: {
        moves: MoveAnalysis[];
        currentIndex: number;
        onMoveClick: (index: number) => void;
    }) => {
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
                // IMPORTANT: Stockfish gives eval from the perspective of the side that just moved
                // - After White's move (even index 0, 2, 4...): eval is from White's perspective
                // - After Black's move (odd index 1, 3, 5...): eval is from Black's perspective
                // We need to normalize all to White's perspective for consistent graphing
                const isBlackMove = index % 2 === 1;

                let evalValue = 0;
                let displayEval = '0.0';

                if (move.mateIn !== null) {
                    // Mate evaluation
                    let normalizedMate = move.mateIn;
                    // Normalize to White's perspective
                    if (isBlackMove) {
                        normalizedMate = -normalizedMate;
                    }
                    evalValue = normalizedMate > 0 ? 10 : -10; // Cap mate at ±10
                    displayEval = normalizedMate > 0 ? `M${Math.abs(move.mateIn)}` : `-M${Math.abs(move.mateIn)}`;
                } else if (move.evaluation !== null) {
                    // Centipawn evaluation - normalize to White's perspective
                    let normalizedEval = move.evaluation;
                    if (isBlackMove) {
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
        const CustomTooltip = ({ active, payload }: any) => {
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

        // Handle chart click
        const handleChartClick = (data: any) => {
            if (data && data.activePayload && data.activePayload[0]) {
                const moveIndex = data.activePayload[0].payload.moveIndex;
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
                <div className="h-32 w-full px-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
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
                    </ResponsiveContainer>
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

            {/* Players Bar - Compact */}
            <div className="bg-gradient-to-r from-zinc-900 via-zinc-800/50 to-zinc-900 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-300 flex items-center justify-center shadow-lg">
                            <span className="text-zinc-800 font-bold text-lg">♔</span>
                        </div>
                        <div>
                            <p className="font-bold text-white">{analysis.game.whitePlayer}</p>
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

                    <div className="flex flex-col items-center gap-1">
                        <div className="px-5 py-2 bg-zinc-900 rounded-lg border border-zinc-700 shadow-inner">
                            <span className="font-bold text-xl tracking-wider text-white">{analysis.game.result}</span>
                        </div>
                        {analysis.game.openingName && (
                            <span className="text-xs text-zinc-500 max-w-[200px] truncate">{analysis.game.openingName}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="font-bold text-white">{analysis.game.blackPlayer}</p>
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
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center shadow-lg border border-zinc-600">
                            <span className="text-zinc-200 font-bold text-lg">♚</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Review Graph */}
            <ReviewGraph
                moves={analysis.moves}
                currentIndex={currentMoveIndex}
                onMoveClick={goToMove}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Panel: Board & Controls */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Vertical Evaluation Bar + Board */}
                    <div className="flex gap-2">
                        {/* Vertical Eval Bar */}
                        <div className="w-6 flex-shrink-0 relative rounded-lg overflow-hidden bg-zinc-800 shadow-inner">
                            <div
                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-100 to-white transition-all duration-300 ease-out"
                                style={{ height: `${getEvalBarWidth(currentEval.evaluation, currentEval.mateIn)}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span
                                    className={cn(
                                        "text-[10px] font-bold px-0.5 py-0.5 rounded writing-mode-vertical transform rotate-180",
                                        (currentEval.evaluation ?? 0) >= 0 ? "text-zinc-800" : "text-zinc-200"
                                    )}
                                    style={{ writingMode: 'vertical-rl' }}
                                >
                                    {formatEval(currentEval.evaluation, currentEval.mateIn)}
                                </span>
                            </div>
                        </div>

                        {/* Chessboard */}
                        <div className="flex-1 rounded-xl overflow-hidden shadow-2xl border border-zinc-700/50">
                            <ChessBoardViewer
                                fen={currentFen}
                                interactive={false}
                                bestMove={currentMoveData.bestMove}
                                destinationSquare={currentMoveData.destinationSquare}
                                classification={currentMoveData.classification}
                                boardOrientation={boardOrientation}
                            />
                        </div>
                    </div>

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
                            onClick={() => goToMove(0)}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={currentMoveIndex === 0}
                            title="Go to start (Home)"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => goToMove(currentMoveIndex - 1)}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={currentMoveIndex === 0}
                            title="Previous move (←)"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="px-4 py-1.5 bg-zinc-800 rounded-lg min-w-[100px] text-center border border-zinc-700/50">
                            <span className="text-xs text-zinc-500">Move</span>
                            <span className="ml-2 font-bold tabular-nums">{currentMoveIndex}/{analysis.moves.length}</span>
                        </div>
                        <button
                            onClick={() => goToMove(currentMoveIndex + 1)}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={currentMoveIndex >= analysis.moves.length}
                            title="Next move (→)"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => goToMove(analysis.moves.length)}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={currentMoveIndex >= analysis.moves.length}
                            title="Go to end (End)"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Current Move Card */}
                    {currentMoveIndex > 0 && analysis.moves[currentMoveIndex - 1] && (
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
                        </div>
                    )}
                </div>

                {/* Middle Panel: Move List */}
                <div className="lg:col-span-4">
                    <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/50 rounded-xl border border-zinc-700/50 backdrop-blur-sm h-full">
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
                                                onClick={() => goToMove(rowIndex * 2 + 1)}
                                                className={cn(
                                                    "flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-all",
                                                    currentMoveIndex === rowIndex * 2 + 1
                                                        ? "bg-emerald-500/20 ring-1 ring-emerald-500/50"
                                                        : "hover:bg-zinc-700/50"
                                                )}
                                            >
                                                <span className="w-4 flex-shrink-0">
                                                    {getClassificationIcon(whiteMove?.classification || 'normal')}
                                                </span>
                                                <span className={cn(
                                                    "font-mono text-xs",
                                                    currentMoveIndex === rowIndex * 2 + 1 ? "text-white font-bold" : "text-zinc-300"
                                                )}>
                                                    {whiteMove?.playedMove || '-'}
                                                </span>
                                            </button>

                                            {/* Black's move */}
                                            {blackMove ? (
                                                <button
                                                    onClick={() => goToMove(rowIndex * 2 + 2)}
                                                    className={cn(
                                                        "flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-all",
                                                        currentMoveIndex === rowIndex * 2 + 2
                                                            ? "bg-emerald-500/20 ring-1 ring-emerald-500/50"
                                                            : "hover:bg-zinc-700/50"
                                                    )}
                                                >
                                                    <span className="w-4 flex-shrink-0">
                                                        {getClassificationIcon(blackMove.classification)}
                                                    </span>
                                                    <span className={cn(
                                                        "font-mono text-xs",
                                                        currentMoveIndex === rowIndex * 2 + 2 ? "text-white font-bold" : "text-zinc-300"
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
                    {/* Accuracy Cards */}
                    <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            <h3 className="text-sm font-semibold text-zinc-300">Accuracy</h3>
                        </div>

                        <div className="space-y-3">
                            {/* White accuracy */}
                            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                                        <span className="w-3 h-3 rounded bg-zinc-100"></span>
                                        {analysis.game.whitePlayer}
                                    </span>
                                    <span className={cn("font-bold text-lg", getAccuracyColor(analysis.whiteMetrics.accuracy))}>
                                        {analysis.whiteMetrics.accuracy.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                                        style={{ width: `${analysis.whiteMetrics.accuracy}%` }}
                                    />
                                </div>
                            </div>

                            {/* Black accuracy */}
                            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                                        <span className="w-3 h-3 rounded bg-zinc-700"></span>
                                        {analysis.game.blackPlayer}
                                    </span>
                                    <span className={cn("font-bold text-lg", getAccuracyColor(analysis.blackMetrics.accuracy))}>
                                        {analysis.blackMetrics.accuracy.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                                        style={{ width: `${analysis.blackMetrics.accuracy}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Move Quality Summary */}
                    <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 backdrop-blur-sm">
                        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Move Quality</h3>

                        <div className="space-y-2">
                            {/* Brilliant */}
                            {(analysis.whiteMetrics.brilliantMoves > 0 || analysis.blackMetrics.brilliantMoves > 0) && (
                                <div className="flex items-center justify-between py-1.5 border-b border-zinc-700/30">
                                    <span className="flex items-center gap-2 text-xs">
                                        <Star className="h-3.5 w-3.5 text-cyan-400" />
                                        <span className="text-cyan-400">Brilliant</span>
                                    </span>
                                    <div className="flex items-center gap-3 text-xs font-mono">
                                        <span className="text-zinc-300">{analysis.whiteMetrics.brilliantMoves}</span>
                                        <span className="text-zinc-600">|</span>
                                        <span className="text-zinc-300">{analysis.blackMetrics.brilliantMoves}</span>
                                    </div>
                                </div>
                            )}

                            {/* Best/Good */}
                            <div className="flex items-center justify-between py-1.5 border-b border-zinc-700/30">
                                <span className="flex items-center gap-2 text-xs">
                                    <Check className="h-3.5 w-3.5 text-green-400" />
                                    <span className="text-green-400">Best/Good</span>
                                </span>
                                <div className="flex items-center gap-3 text-xs font-mono">
                                    <span className="text-zinc-300">{analysis.whiteMetrics.goodMoves}</span>
                                    <span className="text-zinc-600">|</span>
                                    <span className="text-zinc-300">{analysis.blackMetrics.goodMoves}</span>
                                </div>
                            </div>

                            {/* Inaccuracies */}
                            <div className="flex items-center justify-between py-1.5 border-b border-zinc-700/30">
                                <span className="flex items-center gap-2 text-xs">
                                    <MinusCircle className="h-3.5 w-3.5 text-yellow-400" />
                                    <span className="text-yellow-400">Inaccuracies</span>
                                </span>
                                <div className="flex items-center gap-3 text-xs font-mono">
                                    <span className="text-zinc-300">{analysis.whiteMetrics.inaccuracies}</span>
                                    <span className="text-zinc-600">|</span>
                                    <span className="text-zinc-300">{analysis.blackMetrics.inaccuracies}</span>
                                </div>
                            </div>

                            {/* Mistakes */}
                            <div className="flex items-center justify-between py-1.5 border-b border-zinc-700/30">
                                <span className="flex items-center gap-2 text-xs">
                                    <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                                    <span className="text-orange-400">Mistakes</span>
                                </span>
                                <div className="flex items-center gap-3 text-xs font-mono">
                                    <span className="text-zinc-300">{analysis.whiteMetrics.mistakes}</span>
                                    <span className="text-zinc-600">|</span>
                                    <span className="text-zinc-300">{analysis.blackMetrics.mistakes}</span>
                                </div>
                            </div>

                            {/* Blunders */}
                            <div className="flex items-center justify-between py-1.5">
                                <span className="flex items-center gap-2 text-xs">
                                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                                    <span className="text-red-400">Blunders</span>
                                </span>
                                <div className="flex items-center gap-3 text-xs font-mono">
                                    <span className="text-zinc-300">{analysis.whiteMetrics.blunders}</span>
                                    <span className="text-zinc-600">|</span>
                                    <span className="text-zinc-300">{analysis.blackMetrics.blunders}</span>
                                </div>
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
                </div>
            </div>
        </div>
    );
};

export default AnalysisViewer;
