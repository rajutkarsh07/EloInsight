import { Chessboard } from 'react-chessboard';
import { useMemo } from 'react';

interface ChessBoardViewerProps {
    fen?: string;
    onPositionChange?: (fen: string) => void;
    interactive?: boolean;
}

// Battle-tested FEN to position object helper
function fenToPosition(fen: string): Record<string, string> {
    const symbols: Record<string, string> = {
        p: 'bP', r: 'bR', n: 'bN', b: 'bB', q: 'bQ', k: 'bK',
        P: 'wP', R: 'wR', N: 'wN', B: 'wB', Q: 'wQ', K: 'wK'
    };

    const position: Record<string, string> = {};
    const rows = fen.split(' ')[0].split('/');

    rows.forEach((rowStr, rowIdx) => {
        let file = 0;
        for (const c of rowStr) {
            if (/\d/.test(c)) {
                file += Number(c);
            } else {
                const rank = 8 - rowIdx;
                const square = String.fromCharCode(97 + file) + rank;
                position[square] = symbols[c];
                file += 1;
            }
        }
    });

    return position;
}

const ChessBoardViewer = ({
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    onPositionChange,
    interactive = false,
}: ChessBoardViewerProps) => {
    
    // Compute position object whenever FEN changes
    const position = useMemo(() => fenToPosition(fen), [fen]);

    const onDrop = () => {
        if (!interactive) return false;
        onPositionChange?.(fen);
        return true;
    };

    return (
        <div className="bg-card border rounded-lg p-4 max-w-[600px] mx-auto shadow-card">
            <h3 className="font-semibold text-lg mb-2">Chess Board</h3>
            <Chessboard
                id="analysis-board"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                position={position as any}
                onPieceDrop={onDrop}
                arePiecesDraggable={interactive}
                animationDuration={300}
                customDarkSquareStyle={{ backgroundColor: '#779556' }}
                customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
            />
            <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                FEN: {fen}
            </p>
        </div>
    );
};

export default ChessBoardViewer;
