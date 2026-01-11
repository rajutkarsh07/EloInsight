import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

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
        <div className="bg-card border rounded-lg p-4 max-w-[600px] mx-auto shadow-card">
            <h3 className="font-semibold text-lg mb-2">Chess Board</h3>
            {/* @ts-ignore - react-chessboard types may not be up to date */}
            <Chessboard
                position={position}
                onPieceDrop={onDrop}
                customDarkSquareStyle={{ backgroundColor: '#779556' }}
                customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
            />
            <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                FEN: {position}
            </p>
        </div>
    );
};

export default ChessBoardViewer;
