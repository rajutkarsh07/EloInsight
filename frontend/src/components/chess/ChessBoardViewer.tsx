import { Chessboard } from 'react-chessboard';

interface ChessBoardViewerProps {
    fen?: string;
    interactive?: boolean;
}

const ChessBoardViewer = ({
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    interactive = false,
}: ChessBoardViewerProps) => {

    return (
        <div className="bg-card border rounded-lg p-4 max-w-[600px] mx-auto shadow-card">
            <h3 className="font-semibold text-lg mb-2">Chess Board</h3>
            <Chessboard
                key={fen} // Force re-render when FEN changes
                position={fen}
                arePiecesDraggable={interactive}
                animationDuration={200}
                customDarkSquareStyle={{ backgroundColor: '#779556' }}
                customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
                boardOrientation="white"
            />
            <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                FEN: {fen}
            </p>
        </div>
    );
};

export default ChessBoardViewer;