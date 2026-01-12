import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCw, AlertTriangle, XCircle, MinusCircle, ChevronLeft, ChevronRight, Star, Zap, Check, ArrowLeft, Trophy } from 'lucide-react';
import ChessBoardViewer from '../components/chess/ChessBoardViewer';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';

interface MoveAnalysis {
    moveNumber: number;
    halfMove: number;
    fen: string;
    evaluation: number | null;
    mateIn: number | null;
    bestMove: string;
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
    const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

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
    }, [gameId]);

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

    const getCurrentFen = () => {
        if (!analysis) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        if (currentMoveIndex === 0) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const move = analysis.moves[currentMoveIndex - 1];
        return move?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    };

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
        return { evaluation: move?.evaluation ?? 0, mateIn: move?.mateIn ?? null };
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

    const MetricCard = ({
        title,
        whiteValue,
        blackValue,
        unit = '',
        icon,
        reverseColors = false,
    }: {
        title: string;
        whiteValue: number;
        blackValue: number;
        unit?: string;
        icon?: React.ReactNode;
        reverseColors?: boolean;
    }) => {
        const whiteBetter = reverseColors ? whiteValue < blackValue : whiteValue > blackValue;

        return (
            <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                    {icon}
                    <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">White</div>
                        <div className={cn(
                            "text-xl font-bold",
                            whiteBetter ? "text-green-500" : "text-foreground"
                        )}>
                            {typeof whiteValue === 'number' ? whiteValue.toFixed(unit === '%' ? 1 : 0) : whiteValue}{unit}
                        </div>
                    </div>
                    <div className="h-8 w-px bg-border mx-4" />
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-1">Black</div>
                        <div className={cn(
                            "text-xl font-bold",
                            !whiteBetter && whiteValue !== blackValue ? "text-green-500" : "text-foreground"
                        )}>
                            {typeof blackValue === 'number' ? blackValue.toFixed(unit === '%' ? 1 : 0) : blackValue}{unit}
                        </div>
                    </div>
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <button
                        onClick={() => navigate('/analysis')}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
                    >
                        <ArrowLeft size={14} />
                        Back to Analysis
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight">Game Analysis</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium border",
                            analysis.game.platform === 'chess.com' 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                        )}>
                            {analysis.game.platform}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                            {formatTimeControl(analysis.game.timeControl)}
                        </span>
                        {analysis.game.openingName && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                {analysis.game.openingName}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                    <p>Analyzed: {new Date(analysis.analyzedAt).toLocaleDateString()}</p>
                    <p>Depth: {analysis.analysisDepth} • {analysis.engineVersion}</p>
                </div>
            </div>

            {/* Players & Result */}
            <div className="bg-card border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-400 flex items-center justify-center text-black font-bold text-sm">
                            ⚪
                        </div>
                        <div>
                            <p className="font-semibold">{analysis.game.whitePlayer}</p>
                            <p className={cn("text-sm font-bold", getAccuracyColor(analysis.whiteMetrics.accuracy))}>
                                {analysis.whiteMetrics.accuracy.toFixed(1)}% accuracy
                            </p>
                        </div>
                    </div>
                    <div className="px-4 py-2 bg-muted rounded-lg font-bold text-lg">
                        {analysis.game.result}
                    </div>
                    <div className="flex items-center gap-2">
                        <div>
                            <p className="font-semibold text-right">{analysis.game.blackPlayer}</p>
                            <p className={cn("text-sm font-bold text-right", getAccuracyColor(analysis.blackMetrics.accuracy))}>
                                {analysis.blackMetrics.accuracy.toFixed(1)}% accuracy
                            </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center text-white font-bold text-sm">
                            ⚫
                        </div>
                    </div>
                </div>
                {(analysis.whiteMetrics.performanceRating || analysis.blackMetrics.performanceRating) && (
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4 text-amber-400" />
                            <span className="text-muted-foreground">Performance:</span>
                        </div>
                        {analysis.whiteMetrics.performanceRating && (
                            <span>⚪ {analysis.whiteMetrics.performanceRating}</span>
                        )}
                        {analysis.blackMetrics.performanceRating && (
                            <span>⚫ {analysis.blackMetrics.performanceRating}</span>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Board & Moves */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Evaluation Bar */}
                    <div className="h-6 w-full bg-zinc-700 rounded-full overflow-hidden relative">
                        <div 
                            className="h-full bg-white transition-all duration-300 ease-out"
                            style={{ width: `${getEvalBarWidth(currentEval.evaluation, currentEval.mateIn)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={cn(
                                "px-2 py-0.5 rounded text-xs font-bold",
                                (currentEval.evaluation ?? 0) >= 0 ? "bg-zinc-800 text-white" : "bg-white text-zinc-800"
                            )}>
                                {formatEval(currentEval.evaluation, currentEval.mateIn)}
                            </span>
                        </div>
                    </div>

                    {/* Chessboard */}
                    <div className="bg-card border rounded-xl shadow-card overflow-hidden">
                        <ChessBoardViewer
                            fen={getCurrentFen()}
                            interactive={false}
                        />
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => goToMove(0)}
                            className="p-2 rounded-md hover:bg-accent transition-colors disabled:opacity-30"
                            disabled={currentMoveIndex === 0}
                        >
                            <ChevronLeft className="h-5 w-5" />
                            <ChevronLeft className="h-5 w-5 -ml-3" />
                        </button>
                        <button
                            onClick={() => goToMove(currentMoveIndex - 1)}
                            className="p-2 rounded-md hover:bg-accent transition-colors disabled:opacity-30"
                            disabled={currentMoveIndex === 0}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="px-4 py-2 text-sm font-medium bg-muted rounded-md min-w-[100px] text-center">
                            Move {Math.ceil(currentMoveIndex / 2)} / {Math.ceil(analysis.moves.length / 2)}
                        </span>
                        <button
                            onClick={() => goToMove(currentMoveIndex + 1)}
                            className="p-2 rounded-md hover:bg-accent transition-colors disabled:opacity-30"
                            disabled={currentMoveIndex >= analysis.moves.length}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => goToMove(analysis.moves.length)}
                            className="p-2 rounded-md hover:bg-accent transition-colors disabled:opacity-30"
                            disabled={currentMoveIndex >= analysis.moves.length}
                        >
                            <ChevronRight className="h-5 w-5" />
                            <ChevronRight className="h-5 w-5 -ml-3" />
                        </button>
                    </div>

                    {/* Move List */}
                    <div className="bg-card border rounded-xl shadow-card p-4">
                        <h3 className="text-lg font-semibold mb-3">Move List</h3>
                        <div className="max-h-[300px] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-1">
                                {Array.from({ length: Math.ceil(analysis.moves.length / 2) }).map((_, rowIndex) => {
                                    const whiteMove = analysis.moves[rowIndex * 2];
                                    const blackMove = analysis.moves[rowIndex * 2 + 1];
                                    const moveNum = rowIndex + 1;
                                    
                                    return (
                                        <div key={rowIndex} className="contents">
                                            {/* White's move */}
                                            <button
                                                onClick={() => goToMove(rowIndex * 2 + 1)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors border",
                                                    currentMoveIndex === rowIndex * 2 + 1
                                                        ? "bg-primary/20 border-primary"
                                                        : getClassificationColor(whiteMove?.classification || 'normal')
                                                )}
                                            >
                                                <span className="text-muted-foreground text-xs w-6">{moveNum}.</span>
                                                {getClassificationIcon(whiteMove?.classification || 'normal')}
                                                <span className="font-mono">{whiteMove?.playedMove || '-'}</span>
                                            </button>
                                            
                                            {/* Black's move */}
                                            {blackMove ? (
                                                <button
                                                    onClick={() => goToMove(rowIndex * 2 + 2)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors border",
                                                        currentMoveIndex === rowIndex * 2 + 2
                                                            ? "bg-primary/20 border-primary"
                                                            : getClassificationColor(blackMove.classification)
                                                    )}
                                                >
                                                    <span className="text-muted-foreground text-xs w-6">{moveNum}...</span>
                                                    {getClassificationIcon(blackMove.classification)}
                                                    <span className="font-mono">{blackMove.playedMove}</span>
                                                </button>
                                            ) : (
                                                <div />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics Panel */}
                <div className="space-y-6">
                    {/* Current Move Info */}
                    {currentMoveIndex > 0 && analysis.moves[currentMoveIndex - 1] && (
                        <div className="bg-card border rounded-xl shadow-card p-4">
                            <h3 className="text-lg font-semibold mb-3">Current Move</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Played:</span>
                                    <span className="font-mono font-bold">{analysis.moves[currentMoveIndex - 1].playedMove}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Best:</span>
                                    <span className="font-mono text-green-400">{analysis.moves[currentMoveIndex - 1].bestMove}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Classification:</span>
                                    <span className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded text-sm font-medium border",
                                        getClassificationColor(analysis.moves[currentMoveIndex - 1].classification)
                                    )}>
                                        {getClassificationIcon(analysis.moves[currentMoveIndex - 1].classification)}
                                        {analysis.moves[currentMoveIndex - 1].classification}
                                    </span>
                                </div>
                                {analysis.moves[currentMoveIndex - 1].centipawnLoss !== null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">CP Loss:</span>
                                        <span className="font-mono">{analysis.moves[currentMoveIndex - 1].centipawnLoss}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-card border rounded-xl shadow-card p-6">
                        <h3 className="text-lg font-semibold mb-6">Analysis Metrics</h3>
                        <div className="space-y-4">
                            <MetricCard
                                title="Accuracy"
                                whiteValue={analysis.whiteMetrics.accuracy}
                                blackValue={analysis.blackMetrics.accuracy}
                                unit="%"
                            />
                            <MetricCard
                                title="Avg Centipawn Loss"
                                whiteValue={analysis.whiteMetrics.acpl}
                                blackValue={analysis.blackMetrics.acpl}
                                reverseColors
                            />
                            <MetricCard
                                title="Blunders"
                                whiteValue={analysis.whiteMetrics.blunders}
                                blackValue={analysis.blackMetrics.blunders}
                                icon={<XCircle size={14} className="text-red-500" />}
                                reverseColors
                            />
                            <MetricCard
                                title="Mistakes"
                                whiteValue={analysis.whiteMetrics.mistakes}
                                blackValue={analysis.blackMetrics.mistakes}
                                icon={<AlertTriangle size={14} className="text-orange-500" />}
                                reverseColors
                            />
                            <MetricCard
                                title="Inaccuracies"
                                whiteValue={analysis.whiteMetrics.inaccuracies}
                                blackValue={analysis.blackMetrics.inaccuracies}
                                icon={<MinusCircle size={14} className="text-yellow-500" />}
                                reverseColors
                            />
                            <MetricCard
                                title="Brilliant Moves"
                                whiteValue={analysis.whiteMetrics.brilliantMoves}
                                blackValue={analysis.blackMetrics.brilliantMoves}
                                icon={<Star size={14} className="text-cyan-400" />}
                            />
                            <MetricCard
                                title="Good Moves"
                                whiteValue={analysis.whiteMetrics.goodMoves}
                                blackValue={analysis.blackMetrics.goodMoves}
                                icon={<Check size={14} className="text-green-400" />}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisViewer;
