declare module 'react-chessboard' {
    export interface ChessboardProps {
        position?: string;
        onPieceDrop?: (sourceSquare: string, targetSquare: string) => boolean;
        boardWidth?: number;
        customBoardStyle?: Record<string, string>;
        [key: string]: unknown;
    }

    export const Chessboard: React.FC<ChessboardProps>;
}
