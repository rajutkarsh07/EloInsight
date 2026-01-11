import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Box, Paper, Typography } from '@mui/material';

interface ChessBoardViewerProps {
    fen?: string;
    pgn?: string;
    onPositionChange?: (fen: string) => void;
    interactive?: boolean;
}

const ChessBoardViewer = ({
    fen = 'start',
    pgn,
    onPositionChange,
    interactive = false,
}: ChessBoardViewerProps) => {
    const [game] = useState(() => {
        const chess = new Chess();
        if (pgn) {
            chess.loadPgn(pgn);
        } else if (fen !== 'start') {
            chess.load(fen);
        }
        return chess;
    });

    const [position, setPosition] = useState(game.fen());

    const onDrop = (sourceSquare: string, targetSquare: string) => {
        if (!interactive) return false;

        try {
            const move = game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q', // Always promote to queen for simplicity
            });

            if (move === null) return false;

            const newFen = game.fen();
            setPosition(newFen);
            onPositionChange?.(newFen);
            return true;
        } catch (error) {
            return false;
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Box sx={{ maxWidth: 600, margin: '0 auto' }}>
                <Typography variant="h6" gutterBottom>
                    Chess Board
                </Typography>
                {/* @ts-ignore - react-chessboard types may not be up to date */}
                <Chessboard
                    position={position}
                    onPieceDrop={onDrop}
                />
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    FEN: {position}
                </Typography>
            </Box>
        </Paper>
    );
};

export default ChessBoardViewer;
