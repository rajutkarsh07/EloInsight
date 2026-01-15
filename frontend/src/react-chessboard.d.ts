declare module 'react-chessboard' {
    export interface Arrow {
        startSquare: string;
        endSquare: string;
        color: string;
    }

    export interface PieceDataType {
        pieceType: string;
    }

    export interface DraggingPieceDataType {
        isSparePiece: boolean;
        position: string;
        pieceType: string;
    }

    export interface SquareHandlerArgs {
        piece: PieceDataType | null;
        square: string;
    }

    export interface PieceDropHandlerArgs {
        piece: DraggingPieceDataType;
        sourceSquare: string;
        targetSquare: string | null;
    }

    export interface ChessboardOptions {
        id?: string;
        position?: string | Record<string, PieceDataType>;
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
        onPieceDrop?: (args: PieceDropHandlerArgs) => boolean;
        onSquareClick?: (args: SquareHandlerArgs) => void;
        [key: string]: unknown;
    }

    export interface ChessboardProps {
        options?: ChessboardOptions;
    }

    export const Chessboard: React.FC<ChessboardProps>;
}
