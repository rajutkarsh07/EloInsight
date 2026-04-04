import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import {
    Puzzle, Play, RotateCw, Flame, Trophy, Lightbulb, SkipForward,
    Upload, Filter, ChevronDown, ChevronUp, Timer, Target,
    CheckCircle2, XCircle, Zap, Shield, X, Info, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import samplePuzzlesData, { type PuzzleData } from '../data/samplePuzzles';

// ─── Types ───────────────────────────────────────────────────────────────────

type PuzzleMode = 'practice' | 'challenge';
type PuzzleState = 'idle' | 'loading' | 'playing' | 'success' | 'failed';
type DepthFilter = 'all' | 'easy' | 'medium' | 'hard';

interface PuzzleFilters {
    ratingMin: number;
    ratingMax: number;
    themes: string[];
    depth: DepthFilter;
}

interface PuzzleStats {
    solved: number;
    failed: number;
    streak: number;
    bestStreak: number;
    totalAttempts: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AVAILABLE_THEMES = [
    { value: 'mateIn1', label: 'Mate in 1' },
    { value: 'mateIn2', label: 'Mate in 2' },
    { value: 'mateIn3', label: 'Mate in 3' },
    { value: 'backRankMate', label: 'Back Rank Mate' },
    { value: 'smotheredMate', label: 'Smothered Mate' },
    { value: 'fork', label: 'Fork' },
    { value: 'pin', label: 'Pin' },
    { value: 'skewer', label: 'Skewer' },
    { value: 'discoveredAttack', label: 'Discovered Attack' },
    { value: 'sacrifice', label: 'Sacrifice' },
    { value: 'deflection', label: 'Deflection' },
    { value: 'promotion', label: 'Promotion' },
    { value: 'endgame', label: 'Endgame' },
    { value: 'middlegame', label: 'Middlegame' },
    { value: 'opening', label: 'Opening' },
    { value: 'crushing', label: 'Crushing' },
    { value: 'hangingPiece', label: 'Hanging Piece' },
    { value: 'advantage', label: 'Advantage' },
    { value: 'zugzwang', label: 'Zugzwang' },
    { value: 'trappedPiece', label: 'Trapped Piece' },
];

const DEFAULT_FILTERS: PuzzleFilters = {
    ratingMin: 400,
    ratingMax: 2800,
    themes: [],
    depth: 'all',
};

const STATS_KEY = 'chess-puzzles-stats';
const PUZZLES_KEY = 'chess-puzzles-imported';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDepthCategory(moves: string[]): DepthFilter {
    const len = moves.length;
    if (len <= 2) return 'easy';
    if (len <= 4) return 'medium';
    return 'hard';
}

function getSolverColor(fen: string): 'w' | 'b' {
    const parts = fen.split(' ');
    return parts[1] as 'w' | 'b';
}

function uciToMove(uci: string): { from: string; to: string; promotion?: string } {
    return {
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
    };
}

function moveToUci(from: string, to: string, promotion?: string): string {
    return from + to + (promotion || '');
}

function loadStats(): PuzzleStats {
    try {
        const saved = localStorage.getItem(STATS_KEY);
        if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { solved: 0, failed: 0, streak: 0, bestStreak: 0, totalAttempts: 0 };
}

function saveStats(stats: PuzzleStats) {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch { /* ignore */ }
}

function loadImportedPuzzles(): PuzzleData[] {
    try {
        const saved = localStorage.getItem(PUZZLES_KEY);
        if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [];
}

function saveImportedPuzzles(puzzles: PuzzleData[]): { saved: boolean; reason?: string } {
    try {
        const json = JSON.stringify(puzzles);
        if (json.length >= 4_500_000) {
            return { saved: false, reason: `Data too large for localStorage (${(json.length / 1_000_000).toFixed(1)}MB). Puzzles are loaded for this session only.` };
        }
        localStorage.setItem(PUZZLES_KEY, json);
        return { saved: true };
    } catch (err) {
        return { saved: false, reason: 'localStorage quota exceeded. Puzzles are loaded for this session only.' };
    }
}

function parseLichessCSVLine(line: string): PuzzleData | null {
    const parts = line.split(',');
    if (parts.length < 8) return null;

    const puzzleId = parts[0]?.trim();
    const fen = parts[1]?.trim();
    const movesStr = parts[2]?.trim();
    const rating = parseInt(parts[3]?.trim(), 10);
    const popularity = parseInt(parts[5]?.trim(), 10);
    const nbPlays = parseInt(parts[6]?.trim(), 10);
    const themesStr = parts[7]?.trim();
    const gameUrl = parts[8]?.trim() || '';
    const openingStr = parts[9]?.trim() || '';

    if (!puzzleId || !fen || !movesStr || isNaN(rating)) return null;

    const allMoves = movesStr.split(' ').filter(Boolean);
    if (allMoves.length < 2) return null;

    try {
        const game = new Chess(fen);
        const setupMove = uciToMove(allMoves[0]);
        const result = game.move({
            from: setupMove.from,
            to: setupMove.to,
            promotion: setupMove.promotion,
        });
        if (!result) return null;

        return {
            id: puzzleId,
            fen: game.fen(),
            moves: allMoves.slice(1),
            rating,
            themes: themesStr ? themesStr.split(' ').filter(Boolean) : [],
            popularity: isNaN(popularity) ? undefined : popularity,
            nbPlays: isNaN(nbPlays) ? undefined : nbPlays,
            gameUrl: gameUrl || undefined,
            openingTags: openingStr ? openingStr.split(' ').filter(Boolean) : undefined,
        };
    } catch {
        return null;
    }
}

// ─── Component ───────────────────────────────────────────────────────────────

const ChessPuzzles = () => {
    // Puzzle data
    const [allPuzzles, setAllPuzzles] = useState<PuzzleData[]>(() => {
        const imported = loadImportedPuzzles();
        return [...samplePuzzlesData, ...imported];
    });
    const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(null);
    const [solvedPuzzleIds, setSolvedPuzzleIds] = useState<Set<string>>(new Set());

    // Game state
    const [game, setGame] = useState<Chess>(new Chess());
    const [puzzleState, setPuzzleState] = useState<PuzzleState>('idle');
    const [moveIndex, setMoveIndex] = useState(0);
    const [mode, setMode] = useState<PuzzleMode>('practice');
    const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
    const [currentFen, setCurrentFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

    // UI state
    const [filters, setFilters] = useState<PuzzleFilters>(DEFAULT_FILTERS);
    const [showFilters, setShowFilters] = useState(false);
    const [stats, setStats] = useState<PuzzleStats>(loadStats);
    const [hintLevel, setHintLevel] = useState(0);
    const [wrongSquare, setWrongSquare] = useState<string | null>(null);
    const [correctSquare, setCorrectSquare] = useState<string | null>(null);
    const [lastMoveSquares, setLastMoveSquares] = useState<{ from: string; to: string } | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importProgress, setImportProgress] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [animatingOpponent, setAnimatingOpponent] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const wrongSquareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Filtered puzzles
    const filteredPuzzles = useMemo(() => {
        return allPuzzles.filter((p) => {
            if (p.rating < filters.ratingMin || p.rating > filters.ratingMax) return false;
            if (filters.themes.length > 0 && !filters.themes.some((t) => p.themes.includes(t))) return false;
            if (filters.depth !== 'all' && getDepthCategory(p.moves) !== filters.depth) return false;
            return true;
        });
    }, [allPuzzles, filters]);

    // Timer effect
    useEffect(() => {
        if (timerActive) {
            timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timerActive]);

    // Clean up wrong-square highlight timer
    useEffect(() => {
        return () => {
            if (wrongSquareTimerRef.current) clearTimeout(wrongSquareTimerRef.current);
        };
    }, []);

    // ─── Puzzle Loading ──────────────────────────────────────────────────

    const loadPuzzle = useCallback((puzzle: PuzzleData) => {
        try {
            const newGame = new Chess(puzzle.fen);
            setGame(newGame);
            setCurrentPuzzle(puzzle);
            setCurrentFen(puzzle.fen);
            setMoveIndex(0);
            setHintLevel(0);
            setWrongSquare(null);
            setCorrectSquare(null);
            setLastMoveSquares(null);

            const color = getSolverColor(puzzle.fen);
            setBoardOrientation(color === 'w' ? 'white' : 'black');

            setTimer(0);
            setTimerActive(true);
            setPuzzleState('playing');
        } catch {
            console.error('Failed to load puzzle:', puzzle.id);
            loadNextPuzzle();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadNextPuzzle = useCallback(() => {
        if (filteredPuzzles.length === 0) {
            setPuzzleState('idle');
            return;
        }

        const unsolved = filteredPuzzles.filter((p) => !solvedPuzzleIds.has(p.id));
        const pool = unsolved.length > 0 ? unsolved : filteredPuzzles;
        const puzzle = pool[Math.floor(Math.random() * pool.length)];
        loadPuzzle(puzzle);
    }, [filteredPuzzles, solvedPuzzleIds, loadPuzzle]);

    // ─── Move Handling ───────────────────────────────────────────────────

    const playOpponentMoves = useCallback(
        (currentGame: Chess, startIndex: number, puzzle: PuzzleData) => {
            let idx = startIndex;

            if (idx >= puzzle.moves.length) {
                setPuzzleState('success');
                setTimerActive(false);
                setStats((prev) => {
                    const newStats = {
                        ...prev,
                        solved: prev.solved + 1,
                        streak: prev.streak + 1,
                        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
                        totalAttempts: prev.totalAttempts + 1,
                    };
                    saveStats(newStats);
                    return newStats;
                });
                setSolvedPuzzleIds((prev) => new Set([...prev, puzzle.id]));
                return;
            }

            // Opponent moves are at odd indices (1, 3, 5, ...)
            if (idx % 2 === 1) {
                setAnimatingOpponent(true);
                const opponentUci = puzzle.moves[idx];
                const opMove = uciToMove(opponentUci);

                setTimeout(() => {
                    try {
                        const move = currentGame.move({
                            from: opMove.from,
                            to: opMove.to,
                            promotion: opMove.promotion,
                        });
                        if (move) {
                            const newFen = currentGame.fen();
                            setGame(new Chess(newFen));
                            setCurrentFen(newFen);
                            setLastMoveSquares({ from: opMove.from, to: opMove.to });
                            setMoveIndex(idx + 1);

                            if (idx + 1 >= puzzle.moves.length) {
                                setPuzzleState('success');
                                setTimerActive(false);
                                setStats((prev) => {
                                    const newStats = {
                                        ...prev,
                                        solved: prev.solved + 1,
                                        streak: prev.streak + 1,
                                        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
                                        totalAttempts: prev.totalAttempts + 1,
                                    };
                                    saveStats(newStats);
                                    return newStats;
                                });
                                setSolvedPuzzleIds((prev) => new Set([...prev, puzzle.id]));
                            }
                        }
                    } catch {
                        console.error('Failed opponent move:', opponentUci);
                    }
                    setAnimatingOpponent(false);
                }, 500);
            }
        },
        [],
    );

    const handlePieceDrop = useCallback(
        (args: {
            piece: { isSparePiece: boolean; position: string; pieceType: string };
            sourceSquare: string;
            targetSquare: string | null;
        }): boolean => {
            const { piece, sourceSquare, targetSquare } = args;
            if (!targetSquare || puzzleState !== 'playing' || !currentPuzzle || animatingOpponent)
                return false;

            const solverColor = getSolverColor(currentPuzzle.fen);
            const isWhitePiece = piece.pieceType[0] === 'w';
            if ((solverColor === 'w') !== isWhitePiece) return false;

            try {
                const testGame = new Chess(game.fen());

                const isPawnPromotion =
                    piece.pieceType[1]?.toUpperCase() === 'P' &&
                    ((isWhitePiece && targetSquare[1] === '8') ||
                        (!isWhitePiece && targetSquare[1] === '1'));

                const promotion = isPawnPromotion ? 'q' : undefined;

                const move = testGame.move({
                    from: sourceSquare,
                    to: targetSquare,
                    promotion,
                });

                if (!move) return false;

                const userUci = moveToUci(sourceSquare, targetSquare, promotion);
                const expectedUci = currentPuzzle.moves[moveIndex];

                if (userUci === expectedUci) {
                    setCorrectSquare(targetSquare);
                    setWrongSquare(null);
                    setLastMoveSquares({ from: sourceSquare, to: targetSquare });

                    const newFen = testGame.fen();
                    setGame(new Chess(newFen));
                    setCurrentFen(newFen);

                    const nextIndex = moveIndex + 1;
                    setMoveIndex(nextIndex);

                    setTimeout(() => setCorrectSquare(null), 600);

                    playOpponentMoves(new Chess(newFen), nextIndex, currentPuzzle);
                    return true;
                } else {
                    setWrongSquare(targetSquare);
                    if (wrongSquareTimerRef.current) clearTimeout(wrongSquareTimerRef.current);
                    wrongSquareTimerRef.current = setTimeout(() => setWrongSquare(null), 800);

                    if (mode === 'challenge') {
                        setPuzzleState('failed');
                        setTimerActive(false);
                        setStats((prev) => {
                            const newStats = {
                                ...prev,
                                failed: prev.failed + 1,
                                streak: 0,
                                totalAttempts: prev.totalAttempts + 1,
                            };
                            saveStats(newStats);
                            return newStats;
                        });
                    }
                    return false;
                }
            } catch {
                return false;
            }
        },
        [puzzleState, currentPuzzle, game, moveIndex, mode, animatingOpponent, playOpponentMoves],
    );

    // ─── Square Click Support ────────────────────────────────────────────

    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

    const handleSquareClick = useCallback(
        (args: { piece: { pieceType: string } | null; square: string }) => {
            if (puzzleState !== 'playing' || !currentPuzzle || animatingOpponent) return;
            const { piece, square } = args;
            const solverColor = getSolverColor(currentPuzzle.fen);

            if (selectedSquare) {
                if (square === selectedSquare) {
                    setSelectedSquare(null);
                    return;
                }

                const testGame = new Chess(game.fen());
                const selectedPiece = testGame.get(selectedSquare as any);
                if (!selectedPiece) {
                    setSelectedSquare(null);
                    return;
                }

                handlePieceDrop({
                    piece: {
                        isSparePiece: false,
                        position: selectedSquare,
                        pieceType: (selectedPiece.color === 'w' ? 'w' : 'b') + selectedPiece.type.toUpperCase(),
                    },
                    sourceSquare: selectedSquare,
                    targetSquare: square,
                });
                setSelectedSquare(null);
            } else if (piece) {
                const isOwnPiece =
                    (solverColor === 'w' && piece.pieceType[0] === 'w') ||
                    (solverColor === 'b' && piece.pieceType[0] === 'b');
                if (isOwnPiece) {
                    setSelectedSquare(square);
                }
            }
        },
        [puzzleState, currentPuzzle, animatingOpponent, game, selectedSquare, handlePieceDrop],
    );

    // ─── Hint ────────────────────────────────────────────────────────────

    const getHint = useCallback(() => {
        if (!currentPuzzle || moveIndex >= currentPuzzle.moves.length) return;
        setHintLevel((h) => Math.min(h + 1, 2));
    }, [currentPuzzle, moveIndex]);

    const hintSquares = useMemo(() => {
        if (!currentPuzzle || hintLevel === 0 || moveIndex >= currentPuzzle.moves.length) return {};
        const move = uciToMove(currentPuzzle.moves[moveIndex]);
        const styles: Record<string, React.CSSProperties> = {};

        if (hintLevel >= 1) {
            styles[move.from] = {
                backgroundColor: 'rgba(66, 135, 245, 0.5)',
                borderRadius: '50%',
                boxShadow: 'inset 0 0 8px rgba(66, 135, 245, 0.8)',
            };
        }
        if (hintLevel >= 2) {
            styles[move.to] = {
                backgroundColor: 'rgba(66, 135, 245, 0.5)',
                borderRadius: '50%',
                boxShadow: 'inset 0 0 8px rgba(66, 135, 245, 0.8)',
            };
        }
        return styles;
    }, [currentPuzzle, hintLevel, moveIndex]);

    // ─── Reset ───────────────────────────────────────────────────────────

    const resetPuzzle = useCallback(() => {
        if (!currentPuzzle) return;
        loadPuzzle(currentPuzzle);
    }, [currentPuzzle, loadPuzzle]);

    // ─── CSV Import (Streaming) ─────────────────────────────────────────

    const handleCSVImport = useCallback(
        async (file: File) => {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
            setImportProgress(`Opening file (${fileSizeMB} MB)...`);

            try {
                const puzzles: PuzzleData[] = [];
                let linesProcessed = 0;
                let parseErrors = 0;
                let isFirstLine = true;
                const maxPuzzles = 50000;

                // Stream the file in chunks to avoid loading the entire file into memory
                const stream = file.stream();
                const reader = stream.getReader();
                const decoder = new TextDecoder('utf-8');
                let leftover = '';
                let done = false;
                let bytesRead = 0;

                while (!done && puzzles.length < maxPuzzles) {
                    const { value, done: streamDone } = await reader.read();
                    done = streamDone;

                    if (value) {
                        bytesRead += value.length;
                        leftover += decoder.decode(value, { stream: !done });
                    } else if (done && leftover.length === 0) {
                        break;
                    }

                    // Split into lines, keeping the last incomplete line for the next chunk
                    const lines = leftover.split('\n');
                    // Keep the last element as leftover (may be incomplete)
                    leftover = done ? '' : (lines.pop() || '');

                    for (const rawLine of lines) {
                        const line = rawLine.trim();
                        if (!line) continue;

                        // Skip header row
                        if (isFirstLine) {
                            isFirstLine = false;
                            if (line.includes('PuzzleId')) continue;
                        }

                        const puzzle = parseLichessCSVLine(line);
                        if (puzzle) {
                            puzzles.push(puzzle);
                        } else {
                            parseErrors++;
                        }

                        linesProcessed++;

                        if (puzzles.length >= maxPuzzles) break;
                    }

                    // Update progress periodically
                    const pctRead = Math.min(100, Math.round((bytesRead / file.size) * 100));
                    setImportProgress(
                        `${puzzles.length.toLocaleString()} puzzles found from ${linesProcessed.toLocaleString()} lines (${pctRead}% of file read)...`
                    );

                    // Yield to the UI thread so the progress message actually renders
                    await new Promise((r) => setTimeout(r, 0));
                }

                // Cancel remaining stream if we hit the puzzle limit early
                if (!done) {
                    reader.cancel();
                }

                // Handle leftover line (last line without trailing newline)
                if (leftover.trim() && puzzles.length < maxPuzzles) {
                    const line = leftover.trim();
                    if (!(isFirstLine && line.includes('PuzzleId'))) {
                        const puzzle = parseLichessCSVLine(line);
                        if (puzzle) puzzles.push(puzzle);
                        else parseErrors++;
                        linesProcessed++;
                    }
                }

                if (puzzles.length === 0) {
                    setImportProgress(null);
                    toast.error('No valid puzzles found', {
                        description: `Processed ${linesProcessed.toLocaleString()} lines from a ${fileSizeMB} MB file. Make sure you are importing a Lichess puzzle CSV file (not compressed .zst or .bz2).`,
                        duration: 8000,
                    });
                    return;
                }

                setImportProgress(`Saving ${puzzles.length.toLocaleString()} puzzles...`);
                const saveResult = saveImportedPuzzles(puzzles);

                setAllPuzzles(() => {
                    const existingIds = new Set(samplePuzzlesData.map((p) => p.id));
                    const newPuzzles = puzzles.filter((p) => !existingIds.has(p.id));
                    return [...samplePuzzlesData, ...newPuzzles];
                });

                setImportProgress(null);
                setShowImportModal(false);

                toast.success(`${puzzles.length.toLocaleString()} puzzles imported!`, {
                    description: saveResult.saved
                        ? `Loaded from ${linesProcessed.toLocaleString()} lines. Puzzles saved and will persist across sessions.`
                        : `⚠️ ${saveResult.reason}`,
                    duration: saveResult.saved ? 4000 : 8000,
                });

                if (parseErrors > 0) {
                    toast.info(`${parseErrors.toLocaleString()} lines skipped`, {
                        description: 'Some lines could not be parsed (invalid format or incomplete data).',
                        duration: 5000,
                    });
                }
            } catch (err) {
                setImportProgress(null);
                toast.error('Import failed', {
                    description: err instanceof Error ? err.message : 'An unexpected error occurred while reading the file.',
                });
            }
        },
        [],
    );

    // ─── Board Options ───────────────────────────────────────────────────

    const feedbackSquareStyles = useMemo(() => {
        const styles: Record<string, React.CSSProperties> = {};

        if (wrongSquare) {
            styles[wrongSquare] = {
                backgroundColor: 'rgba(220, 38, 38, 0.6)',
                transition: 'background-color 0.2s',
            };
        }
        if (correctSquare) {
            styles[correctSquare] = {
                backgroundColor: 'rgba(34, 197, 94, 0.6)',
                transition: 'background-color 0.2s',
            };
        }
        if (lastMoveSquares && puzzleState === 'playing') {
            const isLightSq = (sq: string) => {
                const col = sq.charCodeAt(0) - 97;
                const row = parseInt(sq[1]) - 1;
                return (col + row) % 2 === 1;
            };
            if (!styles[lastMoveSquares.from]) {
                styles[lastMoveSquares.from] = {
                    backgroundColor: isLightSq(lastMoveSquares.from)
                        ? 'rgba(255, 255, 120, 0.5)'
                        : 'rgba(186, 172, 68, 0.65)',
                };
            }
            if (!styles[lastMoveSquares.to]) {
                styles[lastMoveSquares.to] = {
                    backgroundColor: isLightSq(lastMoveSquares.to)
                        ? 'rgba(255, 255, 100, 0.6)'
                        : 'rgba(205, 190, 80, 0.7)',
                };
            }
        }
        if (selectedSquare) {
            styles[selectedSquare] = {
                backgroundColor: 'rgba(66, 135, 245, 0.5)',
            };
        }

        return { ...styles, ...hintSquares };
    }, [wrongSquare, correctSquare, lastMoveSquares, hintSquares, selectedSquare, puzzleState]);

    const boardOptions = useMemo(
        () => ({
            position: currentFen,
            boardOrientation: boardOrientation,
            allowDragging: puzzleState === 'playing' && !animatingOpponent,
            animationDurationInMs: 300,
            showNotation: true,
            darkSquareStyle: { backgroundColor: '#779556' },
            lightSquareStyle: { backgroundColor: '#ebecd0' },
            squareStyles: feedbackSquareStyles,
            onPieceDrop: puzzleState === 'playing' ? handlePieceDrop : undefined,
            onSquareClick: puzzleState === 'playing' ? handleSquareClick : undefined,
        }),
        [
            currentFen,
            boardOrientation,
            puzzleState,
            animatingOpponent,
            feedbackSquareStyles,
            handlePieceDrop,
            handleSquareClick,
        ],
    );

    // ─── Keyboard Shortcuts ──────────────────────────────────────────────

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'n' || e.key === 'N') {
                if (puzzleState === 'success' || puzzleState === 'failed' || puzzleState === 'idle') {
                    e.preventDefault();
                    loadNextPuzzle();
                }
            }
            if (e.key === 'h' || e.key === 'H') {
                if (puzzleState === 'playing' && mode === 'practice') {
                    e.preventDefault();
                    getHint();
                }
            }
            if (e.key === 'r' || e.key === 'R') {
                if (puzzleState === 'playing' || puzzleState === 'failed') {
                    e.preventDefault();
                    resetPuzzle();
                }
            }
            if (e.key === 'Enter') {
                if (puzzleState === 'success' || puzzleState === 'failed') {
                    e.preventDefault();
                    loadNextPuzzle();
                }
                if (puzzleState === 'idle') {
                    e.preventDefault();
                    loadNextPuzzle();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [puzzleState, mode, loadNextPuzzle, getHint, resetPuzzle]);

    // ─── Computed ────────────────────────────────────────────────────────

    const puzzleDepth = currentPuzzle ? getDepthCategory(currentPuzzle.moves) : 'easy';
    const solverMoveCount = currentPuzzle ? Math.ceil(currentPuzzle.moves.length / 2) : 0;
    const accuracy =
        stats.totalAttempts > 0 ? Math.round((stats.solved / stats.totalAttempts) * 100) : 0;

    const instruction = useMemo(() => {
        if (!currentPuzzle) return '';
        const color = getSolverColor(currentPuzzle.fen);
        const colorName = color === 'w' ? 'White' : 'Black';
        if (currentPuzzle.themes.some((t) => t.startsWith('mate'))) {
            return `${colorName} to move and checkmate`;
        }
        return `${colorName} to move — find the best continuation`;
    }, [currentPuzzle]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // ─── Render ──────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Puzzle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Chess Puzzles</h1>
                        <p className="text-sm text-muted-foreground">
                            Sharpen your tactics — {filteredPuzzles.length} puzzles available
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {stats.streak > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-bold text-orange-500">{stats.streak}</span>
                        </div>
                    )}
                    {stats.bestStreak > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-bold text-yellow-500">{stats.bestStreak}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Board Area */}
                <div className="flex-1 max-w-xl">
                    {/* Instruction banner — above the board */}
                    {puzzleState === 'playing' && instruction && (
                        <div className="mb-3 flex justify-center">
                            <div className="px-4 py-2 bg-black/75 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
                                <Target className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold text-white">{instruction}</span>
                            </div>
                        </div>
                    )}

                    <div
                        className={cn(
                            'relative rounded-xl overflow-hidden border shadow-2xl transition-all',
                            puzzleState === 'playing' && 'border-primary/40 ring-2 ring-primary/30',
                            puzzleState === 'success' && 'border-green-500/50 ring-2 ring-green-500/30',
                            puzzleState === 'failed' && 'border-red-500/50 ring-2 ring-red-500/30',
                            puzzleState === 'idle' && 'border-zinc-700/50',
                        )}
                    >
                        <Chessboard options={boardOptions} />

                        {/* Success overlay */}
                        {puzzleState === 'success' && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 backdrop-blur-sm">
                                <div className="px-8 py-6 bg-black/80 backdrop-blur-md rounded-2xl border border-green-500/30 text-center animate-fade-in-up">
                                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                    <p className="text-xl font-bold text-green-400 mb-1">Correct!</p>
                                    <p className="text-sm text-zinc-400 mb-4">
                                        Solved in {formatTime(timer)}
                                    </p>
                                    <button
                                        onClick={loadNextPuzzle}
                                        className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium text-sm transition-all hover:scale-105"
                                    >
                                        Next Puzzle
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Failed overlay */}
                        {puzzleState === 'failed' && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 backdrop-blur-sm">
                                <div className="px-8 py-6 bg-black/80 backdrop-blur-md rounded-2xl border border-red-500/30 text-center animate-fade-in-up">
                                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                                    <p className="text-xl font-bold text-red-400 mb-1">Incorrect</p>
                                    <p className="text-sm text-zinc-400 mb-4">
                                        {currentPuzzle && (
                                            <span>
                                                Solution:{' '}
                                                {currentPuzzle.moves.map((m, i) => (
                                                    <span key={i} className={i % 2 === 0 ? 'text-green-400 font-mono' : 'text-zinc-500 font-mono'}>
                                                        {m}
                                                        {i < currentPuzzle.moves.length - 1 ? ' ' : ''}
                                                    </span>
                                                ))}
                                            </span>
                                        )}
                                    </p>
                                    <div className="flex gap-3 justify-center">
                                        <button
                                            onClick={resetPuzzle}
                                            className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium text-sm transition-colors"
                                        >
                                            Retry
                                        </button>
                                        <button
                                            onClick={loadNextPuzzle}
                                            className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium text-sm transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Idle overlay */}
                        {puzzleState === 'idle' && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                <div className="px-8 py-6 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                                    <Puzzle className="w-10 h-10 text-primary mx-auto mb-2 opacity-60" />
                                    <p className="text-sm text-zinc-300">
                                        {filteredPuzzles.length > 0
                                            ? 'Press Start or Enter to begin'
                                            : 'Import puzzles or adjust filters'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls under board */}
                    <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            {puzzleState === 'playing' && mode === 'practice' && (
                                <button
                                    onClick={getHint}
                                    className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                                    title="Hint (H)"
                                >
                                    <Lightbulb className="w-4 h-4" />
                                    Hint {hintLevel > 0 && `(${hintLevel}/2)`}
                                </button>
                            )}
                            {(puzzleState === 'playing' || puzzleState === 'failed') && (
                                <button
                                    onClick={resetPuzzle}
                                    className="px-3 py-2 bg-zinc-700/50 hover:bg-zinc-600/50 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                                    title="Reset (R)"
                                >
                                    <RotateCw className="w-4 h-4" />
                                    Reset
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {puzzleState === 'playing' && mode === 'challenge' && (
                                <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700">
                                    <Timer className="w-4 h-4 text-zinc-400" />
                                    <span className="text-sm font-mono tabular-nums text-zinc-300">
                                        {formatTime(timer)}
                                    </span>
                                </div>
                            )}
                            {(puzzleState === 'idle' ||
                                puzzleState === 'success' ||
                                puzzleState === 'failed') && (
                                <button
                                    onClick={loadNextPuzzle}
                                    disabled={filteredPuzzles.length === 0}
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                                        filteredPuzzles.length > 0
                                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105'
                                            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed',
                                    )}
                                    title="Next puzzle (N / Enter)"
                                >
                                    {puzzleState === 'idle' ? (
                                        <>
                                            <Play className="w-4 h-4" /> Start
                                        </>
                                    ) : (
                                        <>
                                            <SkipForward className="w-4 h-4" /> Next
                                        </>
                                    )}
                                </button>
                            )}
                            {puzzleState === 'playing' && (
                                <button
                                    onClick={loadNextPuzzle}
                                    className="px-3 py-2 bg-zinc-700/50 hover:bg-zinc-600/50 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                                    title="Skip (N)"
                                >
                                    <SkipForward className="w-4 h-4" />
                                    Skip
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Side Panel */}
                <div className="lg:w-80 space-y-4">
                    {/* Mode Toggle */}
                    <div className="bg-card rounded-xl border border-zinc-700/50 p-4">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('practice')}
                                className={cn(
                                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
                                    mode === 'practice'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
                                )}
                            >
                                <Shield className="w-4 h-4" />
                                Practice
                            </button>
                            <button
                                onClick={() => setMode('challenge')}
                                className={cn(
                                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
                                    mode === 'challenge'
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
                                )}
                            >
                                <Zap className="w-4 h-4" />
                                Challenge
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {mode === 'practice'
                                ? 'Unlimited retries. Hints available.'
                                : 'One mistake = fail. Timer enabled.'}
                        </p>
                    </div>

                    {/* Puzzle Info */}
                    {currentPuzzle && (
                        <div className="bg-card rounded-xl border border-zinc-700/50 p-4 space-y-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Info className="w-4 h-4 text-muted-foreground" />
                                Puzzle Info
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
                                    <p className="text-xs text-muted-foreground">Rating</p>
                                    <p className="text-lg font-bold text-primary">{currentPuzzle.rating}</p>
                                </div>
                                <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
                                    <p className="text-xs text-muted-foreground">Depth</p>
                                    <p className="text-lg font-bold capitalize">
                                        {solverMoveCount} {solverMoveCount === 1 ? 'move' : 'moves'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-muted-foreground mb-1.5">Themes</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {currentPuzzle.themes.map((theme) => (
                                        <span
                                            key={theme}
                                            className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium"
                                        >
                                            {theme}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
                                <p className="text-xs text-muted-foreground">Difficulty</p>
                                <p
                                    className={cn(
                                        'text-sm font-bold capitalize',
                                        puzzleDepth === 'easy' && 'text-green-400',
                                        puzzleDepth === 'medium' && 'text-yellow-400',
                                        puzzleDepth === 'hard' && 'text-red-400',
                                    )}
                                >
                                    {puzzleDepth}
                                </p>
                            </div>

                            {currentPuzzle.gameUrl && (
                                <a
                                    href={currentPuzzle.gameUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                                >
                                    View original game on Lichess
                                </a>
                            )}
                        </div>
                    )}

                    {/* Filters */}
                    <div className="bg-card rounded-xl border border-zinc-700/50">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="w-full p-4 flex items-center justify-between text-sm font-semibold hover:bg-zinc-800/50 transition-colors rounded-xl"
                        >
                            <span className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-muted-foreground" />
                                Filters
                                {(filters.themes.length > 0 ||
                                    filters.depth !== 'all' ||
                                    filters.ratingMin > 400 ||
                                    filters.ratingMax < 2800) && (
                                    <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                                        Active
                                    </span>
                                )}
                            </span>
                            {showFilters ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </button>

                        {showFilters && (
                            <div className="px-4 pb-4 space-y-4 border-t border-zinc-700/30 pt-4">
                                {/* Rating Range */}
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium mb-2 block">
                                        Rating: {filters.ratingMin} – {filters.ratingMax}
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="400"
                                            max="2800"
                                            step="100"
                                            value={filters.ratingMin}
                                            onChange={(e) =>
                                                setFilters((f) => ({
                                                    ...f,
                                                    ratingMin: Math.min(
                                                        parseInt(e.target.value),
                                                        f.ratingMax - 100,
                                                    ),
                                                }))
                                            }
                                            className="flex-1 accent-primary h-1.5"
                                        />
                                        <input
                                            type="range"
                                            min="400"
                                            max="2800"
                                            step="100"
                                            value={filters.ratingMax}
                                            onChange={(e) =>
                                                setFilters((f) => ({
                                                    ...f,
                                                    ratingMax: Math.max(
                                                        parseInt(e.target.value),
                                                        f.ratingMin + 100,
                                                    ),
                                                }))
                                            }
                                            className="flex-1 accent-primary h-1.5"
                                        />
                                    </div>
                                </div>

                                {/* Depth Selector */}
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium mb-2 block">
                                        Thinking Depth
                                    </label>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {(
                                            [
                                                { value: 'all', label: 'All' },
                                                { value: 'easy', label: 'Easy' },
                                                { value: 'medium', label: 'Med' },
                                                { value: 'hard', label: 'Hard' },
                                            ] as { value: DepthFilter; label: string }[]
                                        ).map((d) => (
                                            <button
                                                key={d.value}
                                                onClick={() => setFilters((f) => ({ ...f, depth: d.value }))}
                                                className={cn(
                                                    'py-1.5 px-2 rounded-lg text-xs font-medium transition-colors',
                                                    filters.depth === d.value
                                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
                                                )}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Theme Multi-Select */}
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium mb-2 block">
                                        Themes ({filters.themes.length} selected)
                                    </label>
                                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                        {AVAILABLE_THEMES.map((theme) => {
                                            const isSelected = filters.themes.includes(theme.value);
                                            return (
                                                <button
                                                    key={theme.value}
                                                    onClick={() =>
                                                        setFilters((f) => ({
                                                            ...f,
                                                            themes: isSelected
                                                                ? f.themes.filter((t) => t !== theme.value)
                                                                : [...f.themes, theme.value],
                                                        }))
                                                    }
                                                    className={cn(
                                                        'w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                                                        isSelected
                                                            ? 'bg-primary/15 text-primary'
                                                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300',
                                                    )}
                                                >
                                                    {isSelected ? '✓ ' : '  '}
                                                    {theme.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Reset Filters */}
                                <button
                                    onClick={() => setFilters(DEFAULT_FILTERS)}
                                    className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="bg-card rounded-xl border border-zinc-700/50 p-4 space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            Statistics
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                                <p className="text-xs text-muted-foreground">Solved</p>
                                <p className="text-lg font-bold text-green-400">{stats.solved}</p>
                            </div>
                            <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                                <p className="text-xs text-muted-foreground">Failed</p>
                                <p className="text-lg font-bold text-red-400">{stats.failed}</p>
                            </div>
                            <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                                <p className="text-xs text-muted-foreground">Accuracy</p>
                                <p className="text-lg font-bold text-blue-400">{accuracy}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Import Button */}
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        Import Lichess Puzzle Database
                    </button>
                </div>
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <ImportModal
                    onClose={() => setShowImportModal(false)}
                    onImport={handleCSVImport}
                    progress={importProgress}
                    currentCount={allPuzzles.length - samplePuzzlesData.length}
                />
            )}
        </div>
    );
};

// ─── Import Modal ────────────────────────────────────────────────────────────

const ImportModal = ({
    onClose,
    onImport,
    progress,
    currentCount,
}: {
    onClose: () => void;
    onImport: (file: File) => void;
    progress: string | null;
    currentCount: number;
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
                onImport(file);
            }
        },
        [onImport],
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
        },
        [onImport],
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-card rounded-2xl border border-zinc-700/50 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fade-in-up">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Import Lichess Puzzles</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {currentCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                        {currentCount.toLocaleString()} imported puzzles currently loaded.
                    </p>
                )}

                <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                        Download the Lichess puzzle database CSV from{' '}
                        <a
                            href="https://database.lichess.org/#puzzles"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                        >
                            database.lichess.org
                        </a>
                        , then import the <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">.csv</code> file here.
                    </p>
                    <p className="text-xs">
                        The full database (~1 GB, ~4M puzzles) is supported — the first 50,000 puzzles will
                        be streamed and loaded. If you downloaded a <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">.csv.zst</code> or{' '}
                        <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">.csv.bz2</code> file,
                        decompress it first to get the <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">.csv</code>.
                    </p>
                </div>

                {progress ? (
                    <div className="py-8 text-center">
                        <RotateCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">{progress}</p>
                    </div>
                ) : (
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={cn(
                            'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                            dragOver
                                ? 'border-primary bg-primary/5'
                                : 'border-zinc-700 hover:border-zinc-600',
                        )}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-medium mb-1">
                            Drop CSV file here or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Accepts .csv files from Lichess puzzle database
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChessPuzzles;
