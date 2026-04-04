export interface PuzzleData {
    id: string;
    fen: string;
    moves: string[];
    rating: number;
    themes: string[];
    popularity?: number;
    nbPlays?: number;
    gameUrl?: string;
    openingTags?: string[];
}

const samplePuzzles: PuzzleData[] = [
    {
        id: 'sample_001',
        fen: '6k1/5ppp/8/8/8/8/3r1PPP/R5K1 w - - 0 1',
        moves: ['a1a8'],
        rating: 600,
        themes: ['mateIn1', 'backRankMate', 'oneMove', 'short'],
    },
    {
        id: 'sample_002',
        fen: 'r1bqkbnr/pppp1p1p/2n3p1/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
        moves: ['h5f7'],
        rating: 600,
        themes: ['mateIn1', 'oneMove', 'short'],
    },
    {
        id: 'sample_003',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
        moves: ['d8h4'],
        rating: 400,
        themes: ['mateIn1', 'oneMove', 'short'],
    },
    {
        id: 'sample_004',
        fen: '7k/R7/6K1/8/8/8/8/8 w - - 0 1',
        moves: ['a7a8'],
        rating: 400,
        themes: ['mateIn1', 'oneMove', 'endgame', 'short'],
    },
    {
        id: 'sample_005',
        fen: '3q1rk1/5ppp/8/5N2/6Q1/8/8/2K5 w - - 0 1',
        moves: ['f5h6', 'g8h8', 'g4g8', 'f8g8', 'h6f7'],
        rating: 1800,
        themes: ['smotheredMate', 'sacrifice', 'mateIn3', 'long'],
    },
    {
        id: 'sample_006',
        fen: '6k1/3q1ppp/8/8/4N3/8/5PPP/6K1 w - - 0 1',
        moves: ['e4f6', 'g8h8', 'f6d7'],
        rating: 1000,
        themes: ['fork', 'short', 'middlegame'],
    },
    {
        id: 'sample_007',
        fen: '7k/6pp/5Q2/8/8/8/8/6K1 w - - 0 1',
        moves: ['f6g7'],
        rating: 500,
        themes: ['mateIn1', 'oneMove', 'short'],
    },
    {
        id: 'sample_008',
        fen: '3k4/pp3p2/6q1/8/8/3B4/PP3PPP/3R2K1 w - - 0 1',
        moves: ['d3g6'],
        rating: 900,
        themes: ['discoveredAttack', 'oneMove', 'short'],
    },
    {
        id: 'sample_009',
        fen: '1kr5/3P4/4K3/8/8/8/8/8 w - - 0 1',
        moves: ['d7c8q'],
        rating: 700,
        themes: ['promotion', 'oneMove', 'endgame', 'short'],
    },
    {
        id: 'sample_010',
        fen: '8/8/8/8/4N3/8/5Kpp/7k w - - 0 1',
        moves: ['e4g3'],
        rating: 700,
        themes: ['mateIn1', 'endgame', 'oneMove', 'short'],
    },
    {
        id: 'lichess_00008',
        fen: 'r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2b1/PqP3PP/7K w - - 0 25',
        moves: ['e6e7', 'b2b1', 'b3c1', 'b1c1', 'h6c1'],
        rating: 1853,
        themes: ['crushing', 'hangingPiece', 'long', 'middlegame'],
        gameUrl: 'https://lichess.org/787zsVup/black#48',
    },
    {
        id: 'sample_012',
        fen: '4k3/8/4K3/8/8/8/8/3R4 w - - 0 1',
        moves: ['d1d8'],
        rating: 400,
        themes: ['mateIn1', 'endgame', 'oneMove', 'short'],
    },
    {
        id: 'sample_013',
        fen: '3k4/1R6/8/8/8/8/8/R3K3 w - - 0 1',
        moves: ['a1a8'],
        rating: 400,
        themes: ['mateIn1', 'endgame', 'oneMove', 'short'],
    },
    {
        id: 'sample_014',
        fen: 'k7/1p6/1B6/8/8/8/8/3R2K1 w - - 0 1',
        moves: ['d1d8'],
        rating: 600,
        themes: ['mateIn1', 'endgame', 'oneMove', 'short'],
    },
    {
        id: 'sample_015',
        fen: '6k1/5ppp/8/8/8/8/r4PPP/3R2K1 w - - 0 1',
        moves: ['d1d8'],
        rating: 500,
        themes: ['mateIn1', 'backRankMate', 'oneMove', 'short'],
    },
    {
        id: 'sample_016',
        fen: '2r3k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1',
        moves: ['c1c8'],
        rating: 500,
        themes: ['mateIn1', 'backRankMate', 'oneMove', 'short'],
    },
    {
        id: 'sample_017',
        fen: '3r2k1/5ppp/8/8/2Q5/8/6PK/4R3 w - - 0 1',
        moves: ['c4c8', 'd8c8', 'e1e8'],
        rating: 1200,
        themes: ['sacrifice', 'backRankMate', 'mateIn2', 'short'],
    },
    {
        id: 'sample_018',
        fen: '3n2k1/5ppp/8/8/8/1Q6/6PK/4R3 w - - 0 1',
        moves: ['e1e8'],
        rating: 500,
        themes: ['mateIn1', 'backRankMate', 'oneMove', 'short'],
    },
    {
        id: 'sample_019',
        fen: 'k7/2K5/8/8/8/8/8/Q7 w - - 0 1',
        moves: ['a1a7'],
        rating: 400,
        themes: ['mateIn1', 'endgame', 'oneMove', 'short'],
    },
    {
        id: 'sample_020',
        fen: '8/8/8/8/8/4Q1K1/8/7k w - - 0 1',
        moves: ['e3e1'],
        rating: 400,
        themes: ['mateIn1', 'endgame', 'oneMove', 'short'],
    },
    {
        id: 'sample_021',
        fen: '8/8/8/8/3q4/8/5PPP/6K1 b - - 0 1',
        moves: ['d4d1'],
        rating: 500,
        themes: ['mateIn1', 'backRankMate', 'oneMove', 'short'],
    },
    {
        id: 'sample_022',
        fen: '6k1/8/8/2n5/8/3Q4/6B1/4K2R b - - 0 1',
        moves: ['c5d3'],
        rating: 600,
        themes: ['fork', 'oneMove', 'short'],
    },
    {
        id: 'sample_023',
        fen: '4r3/8/4k3/8/8/8/8/K6R b - - 0 1',
        moves: ['e8e1', 'a1b2', 'e1h1'],
        rating: 800,
        themes: ['skewer', 'endgame', 'short'],
    },
    {
        id: 'sample_024',
        fen: 'r1bqr1k1/pppp1ppp/2n2n2/2b5/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 b - - 0 7',
        moves: ['f6g4', 'f3e1', 'c5f2'],
        rating: 1300,
        themes: ['fork', 'middlegame', 'short'],
    },
    {
        id: 'sample_025',
        fen: 'r4rk1/ppp2ppp/2np4/2bNp1B1/2B1P1n1/3P4/PPP2PPP/R2Q1RK1 w - - 0 10',
        moves: ['d5f6', 'g8h8', 'f6g4'],
        rating: 1400,
        themes: ['fork', 'middlegame', 'short', 'advantage'],
    },
    {
        id: 'sample_026',
        fen: 'r2qk2r/ppp2ppp/2n1bn2/3pp1B1/2B1P3/3P1N2/PPP2PPP/RN1QK2R w KQkq - 0 6',
        moves: ['c4d5', 'e6d5', 'e4d5'],
        rating: 950,
        themes: ['opening', 'advantage', 'short'],
    },
    {
        id: 'sample_027',
        fen: '6k1/5pp1/4p2p/8/8/4P2P/r4PP1/3R2K1 w - - 0 1',
        moves: ['d1d8', 'g8h7', 'd8d2'],
        rating: 1100,
        themes: ['endgame', 'backRankMate', 'short'],
    },
    {
        id: 'sample_028',
        fen: 'r1b1kbnr/ppppqppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        moves: ['c4f7', 'e7e4', 'f7e8'],
        rating: 1500,
        themes: ['sacrifice', 'middlegame', 'short'],
    },
];

export default samplePuzzles;
