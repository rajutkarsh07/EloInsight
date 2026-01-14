import { Chessboard } from 'react-chessboard';

interface ChessBoardViewerProps {
    fen?: string;
    interactive?: boolean;
}

const ChessBoardViewer = ({
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    interactive = false,
}: ChessBoardViewerProps) => {
    // react-chessboard v5 uses 'options' prop
    const boardOptions = {
        position: fen,
        arePiecesDraggable: interactive,
        animationDuration: 200,
        darkSquareStyle: { backgroundColor: '#779556' },
        lightSquareStyle: { backgroundColor: '#ebecd0' },
        boardOrientation: 'white' as const,
    };

    return (
        <div style={{ width: '100%', maxWidth: '560px', margin: '0 auto' }}>
            <Chessboard 
                key={fen}
                options={boardOptions}
            />
            <p className="text-xs text-muted-foreground mt-2 font-mono break-all text-center">
                FEN: {fen}
            </p>
        </div>
    );
};

export default ChessBoardViewer;
