import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chessboard, defaultPieces } from 'react-chessboard';
import {
    Brain, Play, RotateCw, Send, Flame, Trophy, Trash2,
    Clock, Zap, Shield, Eye, Target, ArrowLeft
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type GamePhase = 'idle' | 'memorize' | 'recall' | 'result';
type ColorFilter = 'white' | 'black' | 'both';
type GameMode = 'normal' | 'hard';

interface PiecePlacement {
    piece: string;
    square: string;
}

interface ResultDetail {
    square: string;
    piece: string;
    status: 'correct' | 'missed' | 'wrong-piece';
    userPiece?: string;
}

interface GameResult {
    correct: number;
    total: number;
    accuracy: number;
    perfect: boolean;
    extraPieces: number;
    details: ResultDetail[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PIECE_TYPES = ['K', 'Q', 'R', 'B', 'N', 'P'] as const;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

const PIECE_LABEL: Record<string, string> = {
    K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn',
};

const PIECE_LIMITS: Record<string, number> = {
    K: 1, Q: 1, R: 2, B: 2, N: 2, P: 8,
};

// ─── Utility Functions ───────────────────────────────────────────────────────

function generateRandomPieces(count: number, colorFilter: ColorFilter, mode: GameMode): PiecePlacement[] {
    const usedSquares = new Set<string>();
    const pieces: PiecePlacement[] = [];
    const colors = colorFilter === 'white' ? ['w'] : colorFilter === 'black' ? ['b'] : ['w', 'b'];
    const pieceCounts: Record<string, number> = {};

    for (let i = 0; i < count; i++) {
        let square: string;
        do {
            const file = FILES[Math.floor(Math.random() * 8)];
            const rank = RANKS[Math.floor(Math.random() * 8)];
            square = file + rank;
        } while (usedSquares.has(square));
        usedSquares.add(square);

        const isPawnRank = square[1] === '1' || square[1] === '8';
        const available: string[] = [];
        for (const c of colors) {
            for (const t of PIECE_TYPES) {
                if (isPawnRank && t === 'P') continue;
                if (mode === 'normal' && (pieceCounts[c + t] || 0) >= PIECE_LIMITS[t]) continue;
                available.push(c + t);
            }
        }

        if (available.length === 0) break;

        const piece = available[Math.floor(Math.random() * available.length)];
        pieceCounts[piece] = (pieceCounts[piece] || 0) + 1;
        pieces.push({ piece, square });
    }

    return pieces;
}

function positionToFen(position: Record<string, string>): string {
    let fen = '';
    for (let rank = 8; rank >= 1; rank--) {
        let empty = 0;
        for (const file of FILES) {
            const piece = position[file + rank];
            if (piece) {
                if (empty > 0) { fen += empty; empty = 0; }
                const type = piece[1];
                fen += piece[0] === 'w' ? type.toUpperCase() : type.toLowerCase();
            } else {
                empty++;
            }
        }
        if (empty > 0) fen += empty;
        if (rank > 1) fen += '/';
    }
    return fen + ' w - - 0 1';
}

function piecesToPosition(pieces: PiecePlacement[]): Record<string, string> {
    const pos: Record<string, string> = {};
    for (const p of pieces) pos[p.square] = p.piece;
    return pos;
}

function evaluateResult(original: PiecePlacement[], userPosition: Record<string, string>): GameResult {
    const details: ResultDetail[] = [];
    let correct = 0;

    for (const { square, piece } of original) {
        if (userPosition[square] === piece) {
            correct++;
            details.push({ square, piece, status: 'correct' });
        } else if (userPosition[square]) {
            details.push({ square, piece, status: 'wrong-piece', userPiece: userPosition[square] });
        } else {
            details.push({ square, piece, status: 'missed' });
        }
    }

    const originalPos = piecesToPosition(original);
    const extraPieces = Object.keys(userPosition).filter(sq => !originalPos[sq]).length;

    return {
        correct,
        total: original.length,
        accuracy: original.length > 0 ? Math.round((correct / original.length) * 100) : 0,
        perfect: correct === original.length && Object.keys(userPosition).length === original.length,
        extraPieces,
        details,
    };
}

function pieceName(code: string): string {
    const color = code[0] === 'w' ? 'White' : 'Black';
    const type = PIECE_LABEL[code[1]] || code[1];
    return `${color} ${type}`;
}

function renderPieceIcon(pieceCode: string, size = '100%') {
    const renderer = defaultPieces[pieceCode];
    if (!renderer) return null;
    return renderer({ svgStyle: { width: size, height: size } });
}

// ─── Component ───────────────────────────────────────────────────────────────

const ChessMemoryTraining = () => {
    const [phase, setPhase] = useState<GamePhase>('idle');
    const [originalPieces, setOriginalPieces] = useState<PiecePlacement[]>([]);
    const [userPosition, setUserPosition] = useState<Record<string, string>>({});
    const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
    const [result, setResult] = useState<GameResult | null>(null);
    const [fadingOut, setFadingOut] = useState(false);

    const [pieceCount, setPieceCount] = useState(3);
    const [timeSeconds, setTimeSeconds] = useState(10);
    const [colorFilter, setColorFilter] = useState<ColorFilter>('both');
    const [mode, setMode] = useState<GameMode>('normal');

    const [timeLeft, setTimeLeft] = useState(0);
    const totalTimeRef = useRef(0);

    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [totalGames, setTotalGames] = useState(0);

    const [remainingPieces, setRemainingPieces] = useState<string[]>([]);
    const [isRetry, setIsRetry] = useState(false);

    // Drag-from-palette state
    const [draggingFromPalette, setDraggingFromPalette] = useState<string | null>(null);
    const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
    const boardContainerRef = useRef<HTMLDivElement>(null);
    const draggingPieceRef = useRef<string | null>(null);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);
    const skipNextClickRef = useRef(false);

    // Ref-based placement function to avoid stale closures in drag handlers
    const placePieceOnSquareRef = useRef<(square: string, piece: string) => void>(() => {});
    placePieceOnSquareRef.current = (square: string, piece: string) => {
        const existing = userPosition[square];
        setUserPosition(prev => ({ ...prev, [square]: piece }));
        if (mode === 'normal') {
            setRemainingPieces(prev => {
                let next = [...prev];
                if (existing) next.push(existing);
                const i = next.indexOf(piece);
                if (i >= 0) next.splice(i, 1);
                return next;
            });
        }
    };

    // ─── Derived State ───────────────────────────────────────────────────────

    const boardPosition = useMemo(() => {
        if (fadingOut) return positionToFen(piecesToPosition(originalPieces));
        switch (phase) {
            case 'idle': return '8/8/8/8/8/8/8/8 w - - 0 1';
            case 'memorize': return positionToFen(piecesToPosition(originalPieces));
            case 'recall': return positionToFen(userPosition);
            case 'result': return positionToFen(piecesToPosition(originalPieces));
            default: return '8/8/8/8/8/8/8/8 w - - 0 1';
        }
    }, [phase, originalPieces, userPosition, fadingOut]);

    const boardSquareStyles = useMemo(() => {
        const styles: Record<string, React.CSSProperties> = {};

        if (phase === 'result') {
            const originalPos = piecesToPosition(originalPieces);

            for (const square of Object.keys(originalPos)) {
                styles[square] = userPosition[square] === originalPos[square]
                    ? { backgroundColor: 'rgba(34, 197, 94, 0.5)', boxShadow: 'inset 0 0 12px rgba(34, 197, 94, 0.3)' }
                    : { backgroundColor: 'rgba(239, 68, 68, 0.5)', boxShadow: 'inset 0 0 12px rgba(239, 68, 68, 0.3)' };
            }

            for (const square of Object.keys(userPosition)) {
                if (!originalPos[square]) {
                    styles[square] = { backgroundColor: 'rgba(234, 179, 8, 0.4)', boxShadow: 'inset 0 0 12px rgba(234, 179, 8, 0.3)' };
                }
            }
        }

        return styles;
    }, [phase, originalPieces, userPosition]);

    const paletteItems = useMemo(() => {
        if (phase !== 'recall') return [];

        if (mode === 'hard') {
            const colors = colorFilter === 'white' ? ['w'] : colorFilter === 'black' ? ['b'] : ['w', 'b'];
            return colors.flatMap(c => PIECE_TYPES.map(t => ({ piece: c + t, count: Infinity })));
        }

        const grouped: Record<string, number> = {};
        for (const p of remainingPieces) {
            grouped[p] = (grouped[p] || 0) + 1;
        }
        return Object.entries(grouped).map(([piece, count]) => ({ piece, count }));
    }, [phase, mode, colorFilter, remainingPieces]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    function handleSquareClick(args: { piece: { pieceType: string } | null; square: string }) {
        if (phase !== 'recall') return;
        if (skipNextClickRef.current) {
            skipNextClickRef.current = false;
            return;
        }

        const { square } = args;
        const existingPiece = userPosition[square];

        if (existingPiece) {
            setUserPosition(prev => {
                const next = { ...prev };
                delete next[square];
                return next;
            });
            if (mode === 'normal') {
                setRemainingPieces(prev => [...prev, existingPiece]);
            }
        } else if (selectedPiece) {
            if (mode === 'normal') {
                const idx = remainingPieces.indexOf(selectedPiece);
                if (idx < 0) return;
                setRemainingPieces(prev => {
                    const i = prev.indexOf(selectedPiece);
                    if (i < 0) return prev;
                    return [...prev.slice(0, i), ...prev.slice(i + 1)];
                });
            }
            setUserPosition(prev => ({ ...prev, [square]: selectedPiece }));
        }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    function handlePieceDrop(args: {
        piece: { isSparePiece: boolean; position: string; pieceType: string };
        sourceSquare: string;
        targetSquare: string | null;
    }): boolean {
        if (phase !== 'recall') return false;
        const { sourceSquare, targetSquare } = args;

        if (!targetSquare) {
            const removed = userPosition[sourceSquare];
            if (!removed) return false;
            setUserPosition(prev => {
                const next = { ...prev };
                delete next[sourceSquare];
                return next;
            });
            if (mode === 'normal') {
                setRemainingPieces(prev => [...prev, removed]);
            }
            return true;
        }

        if (sourceSquare === targetSquare) return false;

        const movedPiece = userPosition[sourceSquare];
        if (!movedPiece) return false;

        const displaced = userPosition[targetSquare];
        setUserPosition(prev => {
            const next = { ...prev };
            delete next[sourceSquare];
            next[targetSquare] = movedPiece;
            return next;
        });
        if (displaced && mode === 'normal') {
            setRemainingPieces(prev => [...prev, displaced]);
        }
        return true;
    }

    const boardOptions = useMemo(() => ({
        position: boardPosition,
        boardOrientation: 'white' as const,
        allowDragging: phase === 'recall',
        allowDragOffBoard: phase === 'recall',
        dragActivationDistance: 5,
        animationDurationInMs: 200,
        showNotation: true,
        darkSquareStyle: { backgroundColor: '#779556' },
        lightSquareStyle: { backgroundColor: '#ebecd0' },
        squareStyles: boardSquareStyles,
        onSquareClick: phase === 'recall' ? handleSquareClick : undefined,
        onPieceDrop: phase === 'recall' ? handlePieceDrop : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [boardPosition, boardSquareStyles, phase, userPosition, selectedPiece, mode, remainingPieces]);

    // ─── Actions ─────────────────────────────────────────────────────────────

    const startGame = useCallback(() => {
        const pieces = generateRandomPieces(pieceCount, colorFilter, mode);
        setOriginalPieces(pieces);
        setUserPosition({});
        setSelectedPiece(null);
        setResult(null);
        setTimeLeft(timeSeconds);
        totalTimeRef.current = timeSeconds;
        setRemainingPieces(pieces.map(p => p.piece));
        setIsRetry(false);
        setPhase('memorize');
    }, [pieceCount, timeSeconds, colorFilter, mode]);

    const handleSubmit = useCallback(() => {
        if (phase !== 'recall') return;

        const gameResult = evaluateResult(originalPieces, userPosition);
        setResult(gameResult);

        if (!isRetry) {
            setTotalGames(prev => prev + 1);
            if (gameResult.perfect) {
                setStreak(prev => {
                    const next = prev + 1;
                    setBestStreak(best => Math.max(best, next));
                    return next;
                });
            } else {
                setStreak(0);
            }
        }

        setPhase('result');
    }, [phase, originalPieces, userPosition, isRetry]);

    const handleClearBoard = useCallback(() => {
        setUserPosition({});
        setSelectedPiece(null);
        if (mode === 'normal') {
            setRemainingPieces(originalPieces.map(p => p.piece));
        }
    }, [mode, originalPieces]);

    const handleNextRound = useCallback(() => {
        startGame();
    }, [startGame]);

    const handleRetry = useCallback(() => {
        setUserPosition({});
        setSelectedPiece(null);
        setResult(null);
        setRemainingPieces(originalPieces.map(p => p.piece));
        setTimeLeft(timeSeconds);
        totalTimeRef.current = timeSeconds;
        setIsRetry(true);
        setPhase('memorize');
    }, [originalPieces, timeSeconds]);

    const handleReady = useCallback(() => {
        if (phase !== 'memorize') return;
        setTimeLeft(0);
    }, [phase]);

    const handleBackToSettings = useCallback(() => {
        setPhase('idle');
        setOriginalPieces([]);
        setUserPosition({});
        setSelectedPiece(null);
        setResult(null);
        setTimeLeft(0);
        setFadingOut(false);
    }, []);

    // ─── Palette Drag Handlers ───────────────────────────────────────────────

    const handlePaletteMouseDown = useCallback((piece: string, e: React.MouseEvent) => {
        e.preventDefault();
        draggingPieceRef.current = piece;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        isDraggingRef.current = false;
        setDragPosition({ x: e.clientX, y: e.clientY });

        const onMove = (ev: MouseEvent) => {
            if (!dragStartRef.current) return;
            const dx = ev.clientX - dragStartRef.current.x;
            const dy = ev.clientY - dragStartRef.current.y;

            if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > 5) {
                isDraggingRef.current = true;
                setDraggingFromPalette(draggingPieceRef.current);
            }
            if (isDraggingRef.current) {
                setDragPosition({ x: ev.clientX, y: ev.clientY });
            }
        };

        const onUp = (ev: MouseEvent) => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);

            if (isDraggingRef.current && boardContainerRef.current) {
                const rect = boardContainerRef.current.getBoundingClientRect();
                const x = ev.clientX - rect.left;
                const y = ev.clientY - rect.top;

                if (x >= 0 && x < rect.width && y >= 0 && y < rect.height) {
                    const col = Math.floor(x / (rect.width / 8));
                    const row = Math.floor(y / (rect.height / 8));
                    if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                        const square = FILES[col] + RANKS[7 - row];
                        placePieceOnSquareRef.current(square, draggingPieceRef.current!);
                        skipNextClickRef.current = true;
                    }
                }
            } else {
                // Was a click, not a drag — toggle selection
                setSelectedPiece(prev => prev === draggingPieceRef.current ? null : draggingPieceRef.current);
            }

            draggingPieceRef.current = null;
            dragStartRef.current = null;
            isDraggingRef.current = false;
            setDraggingFromPalette(null);
            setDragPosition(null);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, []);

    // ─── Effects ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (phase !== 'memorize') return;

        if (timeLeft <= 0) {
            setFadingOut(true);
            const timeout = setTimeout(() => {
                setFadingOut(false);
                setPhase('recall');
            }, 400);
            return () => clearTimeout(timeout);
        }

        const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(timer);
    }, [phase, timeLeft]);

    useEffect(() => {
        if (phase !== 'recall' || mode !== 'normal' || !selectedPiece) return;
        if (!remainingPieces.includes(selectedPiece)) {
            setSelectedPiece(remainingPieces.length > 0 ? remainingPieces[0] : null);
        }
    }, [phase, mode, selectedPiece, remainingPieces]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && phase === 'recall') {
                e.preventDefault();
                handleSubmit();
            }
            if (e.key === 'Escape') {
                setSelectedPiece(null);
            }
            if ((e.key === 'Enter' || e.key === ' ') && phase === 'memorize') {
                e.preventDefault();
                handleReady();
            }
            if (e.key === 'Enter' && phase === 'idle') {
                e.preventDefault();
                startGame();
            }
            if (e.key === 'Enter' && phase === 'result') {
                e.preventDefault();
                handleNextRound();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, handleSubmit, handleReady, startGame, handleNextRound]);

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Brain className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Memory Training</h1>
                        <p className="text-sm text-muted-foreground">Memorize piece positions and recreate them</p>
                    </div>
                </div>

                {(streak > 0 || bestStreak > 0) && (
                    <div className="flex items-center gap-3">
                        {streak > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full">
                                <Flame className="w-4 h-4 text-orange-500" />
                                <span className="text-sm font-bold text-orange-500">{streak}</span>
                            </div>
                        )}
                        {bestStreak > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-bold text-yellow-500">{bestStreak}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main Layout */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Board Area */}
                <div className="flex-1 max-w-xl">
                    {/* Memorize banner — above the board */}
                    {phase === 'memorize' && (
                        <div className="mb-3 flex flex-col items-center gap-2">
                            <div className="px-4 py-2 bg-black/75 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
                                <Eye className="w-4 h-4 text-primary animate-pulse" />
                                <span className="text-sm font-semibold text-white">Memorize!</span>
                                <span className="text-lg font-bold font-mono tabular-nums text-primary ml-1">{timeLeft}s</span>
                            </div>
                            <button
                                onClick={handleReady}
                                className="px-4 py-1.5 bg-primary/90 hover:bg-primary text-primary-foreground text-sm font-semibold rounded-full border border-white/10 shadow-xl backdrop-blur-md transition-all hover:scale-105"
                            >
                                I'm Ready
                            </button>
                        </div>
                    )}

                    <div
                        ref={boardContainerRef}
                        className={cn(
                            'relative rounded-xl overflow-hidden border shadow-2xl transition-all',
                            fadingOut ? 'opacity-0 duration-300' : 'opacity-100 duration-300',
                            phase === 'memorize' && 'border-primary/40 ring-2 ring-primary/30',
                            phase === 'recall' && 'border-amber-500/40 ring-2 ring-amber-500/20',
                            phase === 'result' && 'border-zinc-600/50',
                            phase === 'idle' && 'border-zinc-700/50',
                        )}
                    >
                        <Chessboard options={boardOptions} />

                        {/* Recall: selected piece indicator */}
                        {phase === 'recall' && selectedPiece && !draggingFromPalette && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                                <div className="px-3 py-1.5 bg-black/75 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
                                    <div className="w-7 h-7">{renderPieceIcon(selectedPiece)}</div>
                                    <span className="text-xs text-zinc-300">Click a square to place</span>
                                </div>
                            </div>
                        )}

                        {/* Idle empty board message */}
                        {phase === 'idle' && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                <div className="px-6 py-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                                    <Brain className="w-10 h-10 text-primary mx-auto mb-2 opacity-60" />
                                    <p className="text-sm text-zinc-300">Configure settings and press <strong>Start</strong></p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Piece Palette (recall phase) */}
                    {phase === 'recall' && (
                        <div className="mt-4 p-4 bg-card rounded-xl border border-zinc-700/50 animate-fade-in-up">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-muted-foreground">
                                    {mode === 'normal' ? 'Place these pieces:' : 'Select a piece to place:'}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleClearBoard}
                                        className="px-3 py-1.5 text-xs bg-zinc-700/50 hover:bg-zinc-600/50 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Clear
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        className="px-4 py-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-1.5 font-medium"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        Submit
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {paletteItems.map((item, idx) => (
                                    <div
                                        key={`${item.piece}-${idx}`}
                                        onMouseDown={(e) => handlePaletteMouseDown(item.piece, e)}
                                        className={cn(
                                            'relative w-16 h-16 flex flex-col items-center justify-center rounded-xl border-2 transition-all select-none',
                                            selectedPiece === item.piece
                                                ? 'border-primary bg-primary/20 scale-110 shadow-lg shadow-primary/25'
                                                : 'border-zinc-600 bg-zinc-800 hover:border-zinc-500 hover:bg-zinc-700 hover:scale-105',
                                            'cursor-grab active:cursor-grabbing',
                                        )}
                                        title={`${pieceName(item.piece)} — click or drag to board`}
                                    >
                                        <div className="w-11 h-11 pointer-events-none">
                                            {renderPieceIcon(item.piece)}
                                        </div>
                                        <span className="text-[9px] text-muted-foreground -mt-0.5 pointer-events-none">
                                            {pieceName(item.piece).split(' ')[1]}
                                        </span>
                                        {mode === 'normal' && item.count > 1 && (
                                            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[11px] font-bold rounded-full flex items-center justify-center min-w-[22px] min-h-[22px] pointer-events-none">
                                                {item.count}
                                            </span>
                                        )}
                                    </div>
                                ))}

                                {paletteItems.length === 0 && mode === 'normal' && (
                                    <p className="text-sm text-muted-foreground py-2">
                                        All pieces placed! Click <strong>Submit</strong> or press <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-xs">Enter</kbd>
                                    </p>
                                )}
                            </div>

                            <p className="mt-3 text-xs text-muted-foreground">
                                Drag a piece to the board, or click to select then click a square. Press <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-[10px]">Enter</kbd> to submit.
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Panel */}
                <div className="w-full lg:w-80 space-y-4">
                    {/* Settings (idle) */}
                    {phase === 'idle' && (
                        <div className="p-5 bg-card rounded-xl border border-zinc-700/50 space-y-5">
                            <h2 className="font-semibold text-lg flex items-center gap-2">
                                <Zap className="w-5 h-5 text-primary" />
                                Settings
                            </h2>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Pieces</span>
                                    <span className="font-mono font-bold">{pieceCount}</span>
                                </div>
                                <input
                                    type="range" min="1" max="16" value={pieceCount}
                                    onChange={e => setPieceCount(Number(e.target.value))}
                                    className="w-full accent-primary cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>1</span><span>16</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Time</span>
                                    <span className="font-mono font-bold">{timeSeconds}s</span>
                                </div>
                                <input
                                    type="range" min="3" max="30" value={timeSeconds}
                                    onChange={e => setTimeSeconds(Number(e.target.value))}
                                    className="w-full accent-primary cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>3s</span><span>30s</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-sm text-muted-foreground">Piece Colors</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['both', 'white', 'black'] as const).map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setColorFilter(opt)}
                                            className={cn(
                                                'px-3 py-2 text-xs font-medium rounded-lg border transition-all capitalize',
                                                colorFilter === opt
                                                    ? 'border-primary bg-primary/20 text-primary'
                                                    : 'border-zinc-700 bg-zinc-800/50 text-muted-foreground hover:border-zinc-600',
                                            )}
                                        >{opt}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-sm text-muted-foreground">Mode</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setMode('normal')}
                                        className={cn(
                                            'px-3 py-3 text-xs font-medium rounded-lg border transition-all',
                                            mode === 'normal'
                                                ? 'border-primary bg-primary/20 text-primary'
                                                : 'border-zinc-700 bg-zinc-800/50 text-muted-foreground hover:border-zinc-600',
                                        )}
                                    >
                                        <Shield className="w-4 h-4 mx-auto mb-1.5" />
                                        Normal
                                    </button>
                                    <button
                                        onClick={() => setMode('hard')}
                                        className={cn(
                                            'px-3 py-3 text-xs font-medium rounded-lg border transition-all',
                                            mode === 'hard'
                                                ? 'border-red-500 bg-red-500/20 text-red-400'
                                                : 'border-zinc-700 bg-zinc-800/50 text-muted-foreground hover:border-zinc-600',
                                        )}
                                    >
                                        <Zap className="w-4 h-4 mx-auto mb-1.5" />
                                        Hard
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {mode === 'normal'
                                        ? "You'll receive the exact pieces to place back."
                                        : 'All pieces available — recall both type and position.'}
                                </p>
                            </div>

                            <button
                                onClick={startGame}
                                className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30"
                            >
                                <Play className="w-5 h-5" />
                                Start Game
                            </button>
                        </div>
                    )}

                    {/* Timer (memorize) */}
                    {phase === 'memorize' && (
                        <div className="p-5 bg-card rounded-xl border border-primary/30 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary animate-pulse" />
                                    Memorize
                                </h2>
                                <button onClick={handleBackToSettings} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                                    <ArrowLeft className="w-3.5 h-3.5" />Back
                                </button>
                            </div>

                            <div className="text-center py-2">
                                <div className="text-6xl font-mono font-bold tabular-nums text-primary">{timeLeft}</div>
                                <p className="text-sm text-muted-foreground mt-2">seconds remaining</p>
                            </div>

                            <div className="h-2.5 bg-zinc-700/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000 ease-linear"
                                    style={{ width: `${totalTimeRef.current > 0 ? (timeLeft / totalTimeRef.current) * 100 : 0}%` }}
                                />
                            </div>

                            <div className="text-center text-sm text-muted-foreground space-y-1">
                                <p><strong className="text-foreground">{pieceCount}</strong> piece{pieceCount > 1 ? 's' : ''} to remember</p>
                                <p className="capitalize text-xs">{colorFilter} pieces · {mode} mode</p>
                            </div>

                            <button
                                onClick={handleReady}
                                className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30"
                            >
                                <Brain className="w-5 h-5" />
                                I'm Ready
                            </button>
                        </div>
                    )}

                    {/* Recall info */}
                    {phase === 'recall' && (
                        <div className="p-5 bg-card rounded-xl border border-amber-500/30 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-lg flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-amber-500" />
                                    Recall
                                </h2>
                                <button onClick={handleBackToSettings} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                                    <ArrowLeft className="w-3.5 h-3.5" />Back
                                </button>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Recreate the position from memory. Place <strong className="text-foreground">{pieceCount}</strong> piece{pieceCount > 1 ? 's' : ''} on the board.
                            </p>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Placed:</span>
                                <span className="font-mono font-bold">{Object.keys(userPosition).length} / {pieceCount}</span>
                            </div>

                            <div className="h-2.5 bg-zinc-700/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min((Object.keys(userPosition).length / pieceCount) * 100, 100)}%` }}
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <Send className="w-5 h-5" />
                                Submit (Enter)
                            </button>
                        </div>
                    )}

                    {/* Results */}
                    {phase === 'result' && result && (
                        <div className="p-5 bg-card rounded-xl border border-zinc-700/50 space-y-4">
                            <h2 className="font-semibold text-lg flex items-center gap-2">
                                {result.perfect ? <Trophy className="w-5 h-5 text-yellow-500" /> : <Target className="w-5 h-5 text-blue-400" />}
                                Results
                            </h2>

                            <div className="text-center p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/30">
                                <div className={cn(
                                    'text-5xl font-bold tabular-nums',
                                    result.accuracy === 100 ? 'text-green-500' : result.accuracy >= 50 ? 'text-amber-500' : 'text-red-500',
                                )}>{result.accuracy}%</div>
                                <p className="text-sm text-muted-foreground mt-1">{result.correct} / {result.total} correct</p>
                                {result.extraPieces > 0 && (
                                    <p className="text-xs text-amber-500 mt-1">+{result.extraPieces} extra piece{result.extraPieces > 1 ? 's' : ''}</p>
                                )}
                            </div>

                            <div className={cn(
                                'p-3 rounded-lg text-center text-sm font-medium',
                                result.perfect
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : result.accuracy >= 50
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20',
                            )}>
                                {result.perfect
                                    ? streak > 1 ? `Perfect! ${streak} in a row!` : 'Perfect recall!'
                                    : result.accuracy >= 50 ? 'Good effort! Keep practicing.' : 'Keep trying — start with fewer pieces.'}
                            </div>

                            <div className="space-y-1.5">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Breakdown</span>
                                {result.details.map(d => (
                                    <div key={d.square} className="flex items-center gap-2 text-sm py-1 px-2 rounded-md bg-zinc-800/40">
                                        <span className={cn('text-xs font-bold w-4 text-center', d.status === 'correct' ? 'text-green-500' : 'text-red-500')}>
                                            {d.status === 'correct' ? '✓' : '✗'}
                                        </span>
                                        <div className="w-6 h-6 shrink-0">{renderPieceIcon(d.piece)}</div>
                                        <span className="font-mono text-xs text-muted-foreground">{d.square}</span>
                                        {d.status === 'missed' && <span className="text-xs text-red-400 ml-auto">missed</span>}
                                        {d.status === 'wrong-piece' && d.userPiece && (
                                            <span className="text-xs text-amber-400 ml-auto flex items-center gap-1">
                                                placed <span className="inline-block w-5 h-5">{renderPieceIcon(d.userPiece)}</span>
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-zinc-700/50">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="w-3 h-3 rounded-sm bg-green-500/50" /><span>Correctly placed</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="w-3 h-3 rounded-sm bg-red-500/50" /><span>Missed / wrong piece</span>
                                </div>
                                {result.extraPieces > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <div className="w-3 h-3 rounded-sm bg-yellow-500/50" /><span>Extra piece (wrong square)</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 pt-1">
                                <button onClick={handleNextRound} className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                                    <Play className="w-5 h-5" />Next Round
                                </button>
                                <button onClick={handleRetry} className="w-full py-2.5 bg-zinc-700/50 hover:bg-zinc-600/50 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                                    <RotateCw className="w-4 h-4" />Try Same Puzzle
                                </button>
                                <button onClick={handleBackToSettings} className="w-full py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-zinc-800/50">
                                    <ArrowLeft className="w-4 h-4" />Back to Settings
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Session Stats */}
                    {totalGames > 0 && (
                        <div className="p-4 bg-card rounded-xl border border-zinc-700/50">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Session Stats</h3>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <div className="text-xl font-bold">{totalGames}</div>
                                    <div className="text-xs text-muted-foreground">Games</div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-orange-500">{streak}</div>
                                    <div className="text-xs text-muted-foreground">Streak</div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-yellow-500">{bestStreak}</div>
                                    <div className="text-xs text-muted-foreground">Best</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Drag ghost piece */}
            {draggingFromPalette && dragPosition && (
                <div
                    style={{
                        position: 'fixed',
                        left: dragPosition.x - 32,
                        top: dragPosition.y - 32,
                        width: 64,
                        height: 64,
                        pointerEvents: 'none',
                        zIndex: 10000,
                        opacity: 0.9,
                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                    }}
                >
                    {renderPieceIcon(draggingFromPalette)}
                </div>
            )}
        </div>
    );
};

export default ChessMemoryTraining;
