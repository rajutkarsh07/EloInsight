import { Chessboard } from 'react-chessboard';
import React, { useMemo } from 'react';

interface ChessBoardViewerProps {
    fen?: string;
    interactive?: boolean;
    bestMove?: string; // UCI format like "e2e4" - shows green arrow for suggested move
    lastMove?: string; // UCI format like "e2e4" - highlights the last played move
    destinationSquare?: string; // Square where the last move landed (e.g., "e4")
    classification?: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'book' | 'normal' | 'inaccuracy' | 'mistake' | 'blunder' | null;
    showArrow?: boolean;
    showClassification?: boolean;
    showLastMoveHighlight?: boolean;
    boardOrientation?: 'white' | 'black';
}

// Convert UCI notation to square pair
const uciToSquares = (uci: string): { from: string; to: string } | null => {
    if (!uci || uci.length < 4) return null;
    return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
};

// Classification icon configuration matching chess.com style
const classificationConfig: Record<string, { icon: string; color: string }> = {
    brilliant: { icon: '!!', color: '#1baca6' },
    great: { icon: '!', color: '#5c8bb0' },
    best: { icon: '★', color: '#96bc4b' },
    excellent: { icon: '!', color: '#96bc4b' },
    good: { icon: '', color: '#96bc4b' },
    book: { icon: '📖', color: '#a88865' },
    inaccuracy: { icon: '?!', color: '#f7c631' },
    mistake: { icon: '?', color: '#e58f2a' },
    blunder: { icon: '??', color: '#ca3431' },
};

// Arrow type expected by react-chessboard v5
interface Arrow {
    startSquare: string;
    endSquare: string;
    color: string;
}

const ChessBoardViewer = ({
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    interactive = false,
    bestMove,
    lastMove,
    destinationSquare,
    classification,
    showArrow = true,
    showClassification = true,
    showLastMoveHighlight = true,
    boardOrientation = 'white',
}: ChessBoardViewerProps) => {
    
    // Custom arrows for best move (green arrow)
    const arrows = useMemo((): Arrow[] => {
        if (!showArrow || !bestMove) return [];
        
        const squares = uciToSquares(bestMove);
        if (!squares) return [];
        
        return [{
            startSquare: squares.from,
            endSquare: squares.to,
            color: 'rgba(0, 180, 80, 0.85)'
        }];
    }, [bestMove, showArrow]);

    // Determine if a square is light or dark
    const isLightSquare = (sq: string) => {
        const col = sq.charCodeAt(0) - 97; // a=0, h=7
        const row = parseInt(sq[1]) - 1;   // 1=0, 8=7
        return (col + row) % 2 === 1;
    };

    // Custom square styles for last move highlighting
    const customSquareStyles = useMemo(() => {
        if (!showLastMoveHighlight) return {};
        
        const styles: Record<string, React.CSSProperties> = {};
        
        // If we have full UCI move (e.g., "e2e4"), highlight both squares
        if (lastMove) {
            const squares = uciToSquares(lastMove);
            if (squares) {
                const fromIsLight = isLightSquare(squares.from);
                const toIsLight = isLightSquare(squares.to);
                
                // Source square (where piece came FROM) - darker highlight
                styles[squares.from] = {
                    backgroundColor: fromIsLight 
                        ? 'rgba(255, 255, 120, 0.5)' // Light square: yellowish
                        : 'rgba(186, 172, 68, 0.65)', // Dark square: darker gold
                    boxShadow: 'inset 0 0 3px rgba(0,0,0,0.2)',
                };
                // Destination square (where piece went TO) - brighter highlight
                styles[squares.to] = {
                    backgroundColor: toIsLight 
                        ? 'rgba(255, 255, 100, 0.6)' // Light square: bright yellow
                        : 'rgba(205, 190, 80, 0.7)', // Dark square: gold
                    boxShadow: 'inset 0 0 3px rgba(0,0,0,0.15)',
                };
                return styles;
            }
        }
        
        // Fallback: if no UCI but we have destination square, at least highlight that
        if (destinationSquare) {
            const destIsLight = isLightSquare(destinationSquare);
            styles[destinationSquare] = {
                backgroundColor: destIsLight 
                    ? 'rgba(255, 255, 100, 0.6)' // Light square: bright yellow
                    : 'rgba(205, 190, 80, 0.7)', // Dark square: gold
                boxShadow: 'inset 0 0 3px rgba(0,0,0,0.15)',
            };
        }
        
        return styles;
    }, [lastMove, destinationSquare, showLastMoveHighlight]);

    // Build options object for react-chessboard
    const boardOptions = useMemo(() => ({
        position: fen,
        boardOrientation: boardOrientation,
        allowDragging: interactive,
        animationDurationInMs: 200,
        showNotation: true,
        darkSquareStyle: { backgroundColor: '#779556' },
        lightSquareStyle: { backgroundColor: '#ebecd0' },
        arrows: arrows,
        squareStyles: customSquareStyles, // Last move highlighting
    }), [fen, interactive, arrows, boardOrientation, customSquareStyles]);

    // Get destination square for icon placement
    const iconSquare = destinationSquare;
    const iconData = classification && classification !== 'normal' && classification !== 'good' 
        ? classificationConfig[classification] 
        : null;

    // Adjust badge position based on board orientation
    const isFlipped = boardOrientation === 'black';

    // Debug: log the custom square styles
    if (Object.keys(customSquareStyles).length > 0) {
        console.log('🎨 Square highlights:', customSquareStyles);
    }

    return (
        <div style={{ width: '100%', maxWidth: '560px', margin: '0 auto', position: 'relative' }}>
            <Chessboard options={boardOptions} />
            
            {/* Classification Icon Overlay - Chess.com style badge */}
            {showClassification && iconSquare && iconData && (
                <ClassificationBadge 
                    square={iconSquare} 
                    iconData={iconData}
                    isFlipped={isFlipped}
                />
            )}
        </div>
    );
};

// Classification badge overlay component - positioned at top-right of destination square
const ClassificationBadge = ({ 
    square, 
    iconData,
    isFlipped = false,
}: { 
    square: string; 
    iconData: { icon: string; color: string };
    isFlipped?: boolean;
}) => {
    // Convert square to position
    let col = square.charCodeAt(0) - 97; // a=0, h=7
    let row = 8 - parseInt(square[1]);    // 1=7, 8=0
    
    // Flip coordinates if board is flipped (black perspective)
    if (isFlipped) {
        col = 7 - col;
        row = 7 - row;
    }
    
    // Position as percentage - place at top-right corner of the square
    const left = ((col + 1) * 12.5) - 1.5; // 12.5% per square
    const top = (row * 12.5) + 1.5;
    
    return (
        <div
            style={{
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
                pointerEvents: 'none',
            }}
        >
            <div
                style={{
                    backgroundColor: iconData.color,
                    color: '#fff',
                    borderRadius: '50%',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: iconData.icon.length > 1 ? '10px' : '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    border: '2px solid #fff',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
            >
                {iconData.icon}
            </div>
        </div>
    );
};

export default ChessBoardViewer;
