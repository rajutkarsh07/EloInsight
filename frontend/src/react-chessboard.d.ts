declare module 'react-chessboard' {
    export interface Arrow {
        startSquare: string;
        endSquare: string;
        color: string;
    }

    export interface ChessboardOptions {
        id?: string;
        position?: string | Record<string, { pieceType: string }>;
        boardOrientation?: 'white' | 'black';
        boardStyle?: React.CSSProperties;
        squareStyle?: React.CSSProperties;
        squareStyles?: Record<string, React.CSSProperties>;
        darkSquareStyle?: React.CSSProperties;
        lightSquareStyle?: React.CSSProperties;
        dropSquareStyle?: React.CSSProperties;
        showNotation?: boolean;
        animationDurationInMs?: number;
        showAnimations?: boolean;
        allowDragging?: boolean;
        allowDragOffBoard?: boolean;
        allowDrawingArrows?: boolean;
        arrows?: Arrow[];
        clearArrowsOnClick?: boolean;
        clearArrowsOnPositionChange?: boolean;
        onPieceDrop?: (args: { piece: unknown; sourceSquare: string; targetSquare: string | null }) => boolean;
        onSquareClick?: (args: { piece: unknown; square: string }) => void;
        [key: string]: unknown;
    }

    export interface ChessboardProps {
        options?: ChessboardOptions;
    }

    export const Chessboard: React.FC<ChessboardProps>;
}
