/**
 * ECO Opening Book - Maps move sequences to opening names
 * This is a comprehensive database of common chess openings
 */

interface Opening {
    eco: string;
    name: string;
    moves: string; // Space-separated moves in SAN notation
}

// Common chess openings with their ECO codes and move sequences
const OPENINGS: Opening[] = [
    // A00-A09: Uncommon Openings
    { eco: 'A00', name: 'Polish Opening', moves: '1. b4' },
    { eco: 'A00', name: 'Grob Opening', moves: '1. g4' },
    { eco: 'A00', name: 'Sokolsky Opening', moves: '1. b4' },
    { eco: 'A01', name: "Nimzowitsch-Larsen Attack", moves: '1. b3' },
    { eco: 'A02', name: "Bird's Opening", moves: '1. f4' },
    { eco: 'A04', name: 'Reti Opening', moves: '1. Nf3' },
    { eco: 'A05', name: 'Reti Opening', moves: '1. Nf3 Nf6' },
    { eco: 'A06', name: 'Reti Opening', moves: '1. Nf3 d5' },
    { eco: 'A07', name: 'Reti Opening: King\'s Indian Attack', moves: '1. Nf3 d5 2. g3' },
    { eco: 'A09', name: 'Reti Opening', moves: '1. Nf3 d5 2. c4' },

    // A10-A39: English Opening
    { eco: 'A10', name: 'English Opening', moves: '1. c4' },
    { eco: 'A13', name: 'English Opening', moves: '1. c4 e6' },
    { eco: 'A15', name: 'English Opening: Anglo-Indian Defense', moves: '1. c4 Nf6' },
    { eco: 'A16', name: 'English Opening', moves: '1. c4 Nf6 2. Nc3' },
    { eco: 'A20', name: 'English Opening', moves: '1. c4 e5' },
    { eco: 'A21', name: 'English Opening', moves: '1. c4 e5 2. Nc3' },
    { eco: 'A22', name: 'English Opening: King\'s English', moves: '1. c4 e5 2. Nc3 Nf6' },
    { eco: 'A25', name: 'English Opening: Sicilian Reversed', moves: '1. c4 e5 2. Nc3 Nc6' },
    { eco: 'A26', name: 'English Opening: Closed System', moves: '1. c4 e5 2. Nc3 Nc6 3. g3' },
    { eco: 'A30', name: 'English Opening: Symmetrical Variation', moves: '1. c4 c5' },

    // A40-A49: Queen's Pawn Game and others
    { eco: 'A40', name: "Queen's Pawn Game", moves: '1. d4' },
    { eco: 'A41', name: "Queen's Pawn Game", moves: '1. d4 d6' },
    { eco: 'A43', name: 'Old Benoni Defense', moves: '1. d4 c5' },
    { eco: 'A45', name: "Queen's Pawn Game", moves: '1. d4 Nf6' },
    { eco: 'A46', name: "Queen's Pawn Game", moves: '1. d4 Nf6 2. Nf3' },
    { eco: 'A47', name: "Queen's Indian Defense", moves: '1. d4 Nf6 2. Nf3 b6' },
    { eco: 'A48', name: 'London System', moves: '1. d4 Nf6 2. Nf3 g6 3. Bf4' },
    { eco: 'A48', name: 'London System', moves: '1. d4 d5 2. Nf3 Nf6 3. Bf4' },
    { eco: 'A48', name: 'London System', moves: '1. d4 Nf6 2. Bf4' },

    // A50-A79: Indian Defenses
    { eco: 'A50', name: 'Indian Defense', moves: '1. d4 Nf6 2. c4' },
    { eco: 'A51', name: 'Budapest Defense', moves: '1. d4 Nf6 2. c4 e5' },
    { eco: 'A52', name: 'Budapest Defense', moves: '1. d4 Nf6 2. c4 e5 3. dxe5 Ng4' },
    { eco: 'A53', name: 'Old Indian Defense', moves: '1. d4 Nf6 2. c4 d6' },
    { eco: 'A56', name: 'Benoni Defense', moves: '1. d4 Nf6 2. c4 c5' },
    { eco: 'A57', name: 'Benko Gambit', moves: '1. d4 Nf6 2. c4 c5 3. d5 b5' },
    { eco: 'A60', name: 'Benoni Defense', moves: '1. d4 Nf6 2. c4 c5 3. d5 e6' },
    { eco: 'A70', name: 'Benoni Defense: Classical', moves: '1. d4 Nf6 2. c4 c5 3. d5 e6 4. Nc3 exd5 5. cxd5 d6 6. e4 g6' },

    // A80-A99: Dutch Defense
    { eco: 'A80', name: 'Dutch Defense', moves: '1. d4 f5' },
    { eco: 'A81', name: 'Dutch Defense', moves: '1. d4 f5 2. g3' },
    { eco: 'A82', name: 'Dutch Defense: Staunton Gambit', moves: '1. d4 f5 2. e4' },
    { eco: 'A83', name: 'Dutch Defense: Staunton Gambit', moves: '1. d4 f5 2. e4 fxe4 3. Nc3 Nf6 4. Bg5' },
    { eco: 'A84', name: 'Dutch Defense', moves: '1. d4 f5 2. c4' },
    { eco: 'A85', name: 'Dutch Defense', moves: '1. d4 f5 2. c4 Nf6 3. Nc3' },
    { eco: 'A87', name: 'Dutch Defense: Leningrad Variation', moves: '1. d4 f5 2. c4 Nf6 3. g3 g6 4. Bg2 Bg7' },
    { eco: 'A90', name: 'Dutch Defense', moves: '1. d4 f5 2. c4 Nf6 3. g3 e6 4. Bg2' },

    // B00-B09: Uncommon King's Pawn Defenses
    { eco: 'B00', name: "King's Pawn Game", moves: '1. e4' },
    { eco: 'B00', name: "Nimzowitsch Defense", moves: '1. e4 Nc6' },
    { eco: 'B01', name: 'Scandinavian Defense', moves: '1. e4 d5' },
    { eco: 'B02', name: "Alekhine's Defense", moves: '1. e4 Nf6' },
    { eco: 'B03', name: "Alekhine's Defense", moves: '1. e4 Nf6 2. e5 Nd5 3. d4' },
    { eco: 'B06', name: 'Modern Defense', moves: '1. e4 g6' },
    { eco: 'B07', name: 'Pirc Defense', moves: '1. e4 d6 2. d4 Nf6' },
    { eco: 'B07', name: 'Lion Defense', moves: '1. e4 d6' },
    { eco: 'B08', name: 'Pirc Defense: Classical Variation', moves: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Nf3' },
    { eco: 'B09', name: 'Pirc Defense: Austrian Attack', moves: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. f4' },

    // B10-B19: Caro-Kann Defense
    { eco: 'B10', name: 'Caro-Kann Defense', moves: '1. e4 c6' },
    { eco: 'B12', name: 'Caro-Kann Defense', moves: '1. e4 c6 2. d4' },
    { eco: 'B13', name: 'Caro-Kann Defense: Exchange Variation', moves: '1. e4 c6 2. d4 d5 3. exd5 cxd5' },
    { eco: 'B14', name: 'Caro-Kann Defense: Panov-Botvinnik Attack', moves: '1. e4 c6 2. d4 d5 3. exd5 cxd5 4. c4' },
    { eco: 'B15', name: 'Caro-Kann Defense', moves: '1. e4 c6 2. d4 d5 3. Nc3' },
    { eco: 'B17', name: 'Caro-Kann Defense: Steinitz Variation', moves: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7' },
    { eco: 'B18', name: 'Caro-Kann Defense: Classical Variation', moves: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5' },
    { eco: 'B19', name: 'Caro-Kann Defense: Classical Variation', moves: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3' },

    // B20-B99: Sicilian Defense
    { eco: 'B20', name: 'Sicilian Defense', moves: '1. e4 c5' },
    { eco: 'B21', name: 'Sicilian Defense: Smith-Morra Gambit', moves: '1. e4 c5 2. d4 cxd4 3. c3' },
    { eco: 'B22', name: 'Sicilian Defense: Alapin Variation', moves: '1. e4 c5 2. c3' },
    { eco: 'B23', name: 'Sicilian Defense: Closed', moves: '1. e4 c5 2. Nc3' },
    { eco: 'B27', name: 'Sicilian Defense', moves: '1. e4 c5 2. Nf3' },
    { eco: 'B30', name: 'Sicilian Defense', moves: '1. e4 c5 2. Nf3 Nc6' },
    { eco: 'B32', name: 'Sicilian Defense: Open', moves: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4' },
    { eco: 'B33', name: 'Sicilian Defense: Sveshnikov Variation', moves: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e5' },
    { eco: 'B40', name: 'Sicilian Defense', moves: '1. e4 c5 2. Nf3 e6' },
    { eco: 'B42', name: 'Sicilian Defense: Kan Variation', moves: '1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 a6' },
    { eco: 'B44', name: 'Sicilian Defense: Taimanov Variation', moves: '1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nc6' },
    { eco: 'B50', name: 'Sicilian Defense', moves: '1. e4 c5 2. Nf3 d6' },
    { eco: 'B52', name: 'Sicilian Defense: Canal Attack', moves: '1. e4 c5 2. Nf3 d6 3. Bb5+' },
    { eco: 'B54', name: 'Sicilian Defense', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4' },
    { eco: 'B56', name: 'Sicilian Defense', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3' },
    { eco: 'B60', name: 'Sicilian Defense: Richter-Rauzer Variation', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 Nc6 6. Bg5' },
    { eco: 'B70', name: 'Sicilian Defense: Dragon Variation', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6' },
    { eco: 'B72', name: 'Sicilian Defense: Dragon Variation', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3' },
    { eco: 'B76', name: 'Sicilian Defense: Yugoslav Attack', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3' },
    { eco: 'B80', name: 'Sicilian Defense: Scheveningen Variation', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e6' },
    { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6' },
    { eco: 'B92', name: 'Sicilian Defense: Najdorf Variation', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2' },
    { eco: 'B96', name: 'Sicilian Defense: Najdorf Variation', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5' },
    { eco: 'B97', name: 'Sicilian Defense: Najdorf, Poisoned Pawn', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4 Qb6' },

    // C00-C19: French Defense
    { eco: 'C00', name: 'French Defense', moves: '1. e4 e6' },
    { eco: 'C01', name: 'French Defense: Exchange Variation', moves: '1. e4 e6 2. d4 d5 3. exd5 exd5' },
    { eco: 'C02', name: 'French Defense: Advance Variation', moves: '1. e4 e6 2. d4 d5 3. e5' },
    { eco: 'C03', name: 'French Defense: Tarrasch Variation', moves: '1. e4 e6 2. d4 d5 3. Nd2' },
    { eco: 'C10', name: 'French Defense', moves: '1. e4 e6 2. d4 d5 3. Nc3' },
    { eco: 'C11', name: 'French Defense: Classical Variation', moves: '1. e4 e6 2. d4 d5 3. Nc3 Nf6' },
    { eco: 'C13', name: 'French Defense: Classical Variation', moves: '1. e4 e6 2. d4 d5 3. Nc3 Nf6 4. Bg5' },
    { eco: 'C15', name: 'French Defense: Winawer Variation', moves: '1. e4 e6 2. d4 d5 3. Nc3 Bb4' },
    { eco: 'C18', name: 'French Defense: Winawer Variation', moves: '1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5 c5 5. a3 Bxc3+ 6. bxc3' },
    { eco: 'C19', name: 'French Defense: Winawer Variation', moves: '1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5 c5 5. a3 Bxc3+ 6. bxc3 Ne7' },

    // C20-C29: King's Pawn Game
    { eco: 'C20', name: "King's Pawn Game", moves: '1. e4 e5' },
    { eco: 'C21', name: "King's Pawn Game: Center Game", moves: '1. e4 e5 2. d4' },
    { eco: 'C22', name: "King's Pawn Game: Center Game", moves: '1. e4 e5 2. d4 exd4 3. Qxd4' },
    { eco: 'C23', name: "Bishop's Opening", moves: '1. e4 e5 2. Bc4' },
    { eco: 'C25', name: 'Vienna Game', moves: '1. e4 e5 2. Nc3' },
    { eco: 'C26', name: 'Vienna Game', moves: '1. e4 e5 2. Nc3 Nf6' },
    { eco: 'C27', name: 'Vienna Game', moves: '1. e4 e5 2. Nc3 Nf6 3. Bc4' },
    { eco: 'C29', name: 'Vienna Game', moves: '1. e4 e5 2. Nc3 Nf6 3. f4' },

    // C30-C39: King's Gambit
    { eco: 'C30', name: "King's Gambit", moves: '1. e4 e5 2. f4' },
    { eco: 'C31', name: "King's Gambit: Falkbeer Countergambit", moves: '1. e4 e5 2. f4 d5' },
    { eco: 'C33', name: "King's Gambit Accepted", moves: '1. e4 e5 2. f4 exf4' },
    { eco: 'C36', name: "King's Gambit Accepted", moves: '1. e4 e5 2. f4 exf4 3. Nf3 d5' },
    { eco: 'C37', name: "King's Gambit Accepted", moves: '1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Nc3' },

    // C40-C49: King's Knight Opening and variations
    { eco: 'C40', name: "King's Knight Opening", moves: '1. e4 e5 2. Nf3' },
    { eco: 'C41', name: "Philidor Defense", moves: '1. e4 e5 2. Nf3 d6' },
    { eco: 'C42', name: 'Petrov Defense', moves: '1. e4 e5 2. Nf3 Nf6' },
    { eco: 'C43', name: 'Petrov Defense: Steinitz Attack', moves: '1. e4 e5 2. Nf3 Nf6 3. d4' },
    { eco: 'C44', name: "King's Knight Opening", moves: '1. e4 e5 2. Nf3 Nc6' },
    { eco: 'C44', name: 'Scotch Game', moves: '1. e4 e5 2. Nf3 Nc6 3. d4' },
    { eco: 'C45', name: 'Scotch Game', moves: '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4' },
    { eco: 'C46', name: 'Three Knights Opening', moves: '1. e4 e5 2. Nf3 Nc6 3. Nc3' },
    { eco: 'C47', name: 'Four Knights Game', moves: '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6' },
    { eco: 'C48', name: 'Four Knights Game: Spanish Variation', moves: '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. Bb5' },

    // C50-C59: Italian Game
    { eco: 'C50', name: 'Italian Game', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4' },
    { eco: 'C50', name: 'Giuoco Piano', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5' },
    { eco: 'C51', name: 'Italian Game: Evans Gambit', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4' },
    { eco: 'C52', name: 'Italian Game: Evans Gambit', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3' },
    { eco: 'C53', name: 'Italian Game: Giuoco Piano', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3' },
    { eco: 'C54', name: 'Italian Game: Giuoco Piano', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4' },
    { eco: 'C55', name: 'Italian Game: Two Knights Defense', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6' },
    { eco: 'C57', name: 'Italian Game: Two Knights, Fried Liver Attack', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5' },

    // C60-C99: Ruy Lopez
    { eco: 'C60', name: 'Ruy Lopez', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5' },
    { eco: 'C62', name: 'Ruy Lopez: Steinitz Defense', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 d6' },
    { eco: 'C63', name: "Ruy Lopez: Schliemann Defense", moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 f5' },
    { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6' },
    { eco: 'C66', name: 'Ruy Lopez: Berlin Defense', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O d6' },
    { eco: 'C67', name: 'Ruy Lopez: Berlin Defense', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4' },
    { eco: 'C68', name: 'Ruy Lopez: Exchange Variation', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6' },
    { eco: 'C70', name: 'Ruy Lopez: Morphy Defense', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6' },
    { eco: 'C72', name: 'Ruy Lopez: Modern Steinitz Defense', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 d6' },
    { eco: 'C78', name: 'Ruy Lopez: Archangelsk Variation', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O b5' },
    { eco: 'C80', name: 'Ruy Lopez: Open Variation', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Nxe4' },
    { eco: 'C84', name: 'Ruy Lopez: Closed Variation', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7' },
    { eco: 'C88', name: 'Ruy Lopez: Closed Variation', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3' },
    { eco: 'C92', name: 'Ruy Lopez: Closed Variation', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3' },

    // D00-D09: Queen's Pawn Game
    { eco: 'D00', name: "Queen's Pawn Game", moves: '1. d4 d5' },
    { eco: 'D00', name: 'London System', moves: '1. d4 d5 2. Bf4' },
    { eco: 'D01', name: 'Veresov Attack', moves: '1. d4 d5 2. Nc3' },
    { eco: 'D02', name: "Queen's Pawn Game", moves: '1. d4 d5 2. Nf3' },
    { eco: 'D03', name: 'Torre Attack', moves: '1. d4 d5 2. Nf3 Nf6 3. Bg5' },
    { eco: 'D04', name: "Queen's Pawn Game: Colle System", moves: '1. d4 d5 2. Nf3 Nf6 3. e3' },
    { eco: 'D05', name: "Queen's Pawn Game: Colle System", moves: '1. d4 d5 2. Nf3 Nf6 3. e3 e6 4. Bd3' },
    { eco: 'D06', name: "Queen's Gambit", moves: '1. d4 d5 2. c4' },
    { eco: 'D07', name: "Queen's Gambit: Chigorin Defense", moves: '1. d4 d5 2. c4 Nc6' },
    { eco: 'D08', name: "Queen's Gambit: Albin Countergambit", moves: '1. d4 d5 2. c4 e5' },

    // D10-D19: Slav Defense
    { eco: 'D10', name: 'Slav Defense', moves: '1. d4 d5 2. c4 c6' },
    { eco: 'D11', name: 'Slav Defense', moves: '1. d4 d5 2. c4 c6 3. Nf3' },
    { eco: 'D12', name: 'Slav Defense', moves: '1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. e3' },
    { eco: 'D13', name: 'Slav Defense: Exchange Variation', moves: '1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. cxd5 cxd5' },
    { eco: 'D15', name: 'Slav Defense', moves: '1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3' },
    { eco: 'D16', name: 'Slav Defense', moves: '1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 dxc4' },
    { eco: 'D17', name: 'Slav Defense', moves: '1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 dxc4 5. a4 Bf5' },

    // D20-D29: Queen's Gambit Accepted
    { eco: 'D20', name: "Queen's Gambit Accepted", moves: '1. d4 d5 2. c4 dxc4' },
    { eco: 'D21', name: "Queen's Gambit Accepted", moves: '1. d4 d5 2. c4 dxc4 3. Nf3' },
    { eco: 'D22', name: "Queen's Gambit Accepted", moves: '1. d4 d5 2. c4 dxc4 3. Nf3 a6' },
    { eco: 'D24', name: "Queen's Gambit Accepted", moves: '1. d4 d5 2. c4 dxc4 3. Nf3 Nf6 4. Nc3' },
    { eco: 'D27', name: "Queen's Gambit Accepted: Classical Defense", moves: '1. d4 d5 2. c4 dxc4 3. Nf3 Nf6 4. e3 e6 5. Bxc4 c5 6. O-O a6' },

    // D30-D69: Queen's Gambit Declined
    { eco: 'D30', name: "Queen's Gambit Declined", moves: '1. d4 d5 2. c4 e6' },
    { eco: 'D31', name: "Queen's Gambit Declined", moves: '1. d4 d5 2. c4 e6 3. Nc3' },
    { eco: 'D32', name: "Queen's Gambit Declined: Tarrasch Defense", moves: '1. d4 d5 2. c4 e6 3. Nc3 c5' },
    { eco: 'D35', name: "Queen's Gambit Declined: Exchange Variation", moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. cxd5' },
    { eco: 'D37', name: "Queen's Gambit Declined", moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3' },
    { eco: 'D38', name: "Queen's Gambit Declined: Ragozin Defense", moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Bb4' },
    { eco: 'D40', name: "Queen's Gambit Declined: Semi-Tarrasch", moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 c5' },
    { eco: 'D43', name: 'Semi-Slav Defense', moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 c6' },
    { eco: 'D45', name: 'Semi-Slav Defense', moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 c6 5. e3' },
    { eco: 'D50', name: "Queen's Gambit Declined", moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5' },
    { eco: 'D53', name: "Queen's Gambit Declined", moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7' },
    { eco: 'D56', name: "Queen's Gambit Declined: Lasker Defense", moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bh4 Ne4' },

    // D70-D99: Grünfeld Defense
    { eco: 'D70', name: 'Grünfeld Defense', moves: '1. d4 Nf6 2. c4 g6 3. f3' },
    { eco: 'D76', name: 'Grünfeld Defense', moves: '1. d4 Nf6 2. c4 g6 3. g3 d5' },
    { eco: 'D80', name: 'Grünfeld Defense', moves: '1. d4 Nf6 2. c4 g6 3. Nc3 d5' },
    { eco: 'D85', name: 'Grünfeld Defense: Exchange Variation', moves: '1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. cxd5 Nxd5 5. e4 Nxc3 6. bxc3' },
    { eco: 'D90', name: 'Grünfeld Defense', moves: '1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. Nf3' },
    { eco: 'D97', name: 'Grünfeld Defense: Russian Variation', moves: '1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. Nf3 Bg7 5. Qb3' },

    // E00-E09: Catalan Opening
    { eco: 'E00', name: 'Catalan Opening', moves: '1. d4 Nf6 2. c4 e6 3. g3' },
    { eco: 'E04', name: 'Catalan Opening: Open Variation', moves: '1. d4 Nf6 2. c4 e6 3. g3 d5 4. Bg2 dxc4' },
    { eco: 'E06', name: 'Catalan Opening: Closed Variation', moves: '1. d4 Nf6 2. c4 e6 3. g3 d5 4. Bg2 Be7 5. Nf3' },

    // E10-E19: Queen's Indian Defense
    { eco: 'E10', name: "Queen's Indian Defense", moves: '1. d4 Nf6 2. c4 e6 3. Nf3' },
    { eco: 'E12', name: "Queen's Indian Defense", moves: '1. d4 Nf6 2. c4 e6 3. Nf3 b6' },
    { eco: 'E15', name: "Queen's Indian Defense", moves: '1. d4 Nf6 2. c4 e6 3. Nf3 b6 4. g3' },
    { eco: 'E17', name: "Queen's Indian Defense", moves: '1. d4 Nf6 2. c4 e6 3. Nf3 b6 4. g3 Bb7 5. Bg2 Be7' },

    // E20-E59: Nimzo-Indian Defense
    { eco: 'E20', name: 'Nimzo-Indian Defense', moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4' },
    { eco: 'E21', name: 'Nimzo-Indian Defense: Three Knights Variation', moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Nf3' },
    { eco: 'E24', name: 'Nimzo-Indian Defense: Sämisch Variation', moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. a3 Bxc3+ 5. bxc3' },
    { eco: 'E32', name: 'Nimzo-Indian Defense: Classical Variation', moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Qc2' },
    { eco: 'E40', name: 'Nimzo-Indian Defense', moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3' },
    { eco: 'E41', name: 'Nimzo-Indian Defense: Hübner Variation', moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 c5' },
    { eco: 'E46', name: 'Nimzo-Indian Defense: Reshevsky Variation', moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 O-O' },
    { eco: 'E53', name: 'Nimzo-Indian Defense: Main Line', moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 O-O 5. Bd3 d5 6. Nf3 c5 7. O-O' },

    // E60-E99: King's Indian Defense
    { eco: 'E60', name: "King's Indian Defense", moves: '1. d4 Nf6 2. c4 g6' },
    { eco: 'E61', name: "King's Indian Defense", moves: '1. d4 Nf6 2. c4 g6 3. Nc3' },
    { eco: 'E62', name: "King's Indian Defense: Fianchetto Variation", moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. Nf3 d6 5. g3' },
    { eco: 'E70', name: "King's Indian Defense", moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4' },
    { eco: 'E73', name: "King's Indian Defense: Averbakh Variation", moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Be2 O-O 6. Bg5' },
    { eco: 'E76', name: "King's Indian Defense: Four Pawns Attack", moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f4' },
    { eco: 'E80', name: "King's Indian Defense: Sämisch Variation", moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f3' },
    { eco: 'E90', name: "King's Indian Defense: Classical Variation", moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3' },
    { eco: 'E92', name: "King's Indian Defense: Classical Variation", moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2' },
    { eco: 'E97', name: "King's Indian Defense: Mar del Plata Variation", moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6' },
    { eco: 'E99', name: "King's Indian Defense: Mar del Plata Variation", moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6 8. d5 Ne7 9. Ne1' },
];

// Sort openings by move sequence length (longest first) for best matching
const SORTED_OPENINGS = [...OPENINGS].sort((a, b) => b.moves.length - a.moves.length);

/**
 * Normalize a move sequence for comparison
 * Removes move numbers and extra whitespace
 */
function normalizeMoves(moves: string): string {
    return moves
        .replace(/\d+\.\s*/g, '') // Remove move numbers like "1. " or "1... "
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim()
        .toLowerCase();
}

/**
 * Extract moves from PGN (remove headers and result)
 */
function extractMovesFromPgn(pgn: string): string {
    // Remove PGN headers [...]
    let moves = pgn.replace(/\[[^\]]*\]/g, '');
    // Remove result at end (1-0, 0-1, 1/2-1/2, *)
    moves = moves.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '');
    // Remove comments {...}
    moves = moves.replace(/\{[^}]*\}/g, '');
    // Remove variations (...)
    moves = moves.replace(/\([^)]*\)/g, '');
    // Normalize
    return normalizeMoves(moves);
}

/**
 * Detect opening from PGN move sequence
 * Returns the most specific opening that matches the game's moves
 */
export function detectOpeningFromMoves(pgn: string): { eco?: string; name?: string } {
    const gameMoves = extractMovesFromPgn(pgn);
    
    if (!gameMoves) {
        return {};
    }

    // Try to find the longest matching opening
    for (const opening of SORTED_OPENINGS) {
        const openingMoves = normalizeMoves(opening.moves);
        
        // Check if the game starts with these opening moves
        if (gameMoves.startsWith(openingMoves) || gameMoves === openingMoves) {
            return { eco: opening.eco, name: opening.name };
        }
    }

    // Fallback: just check first move for basic categorization
    const firstMove = gameMoves.split(' ')[0];
    if (firstMove === 'e4') {
        return { eco: 'B00', name: "King's Pawn Game" };
    } else if (firstMove === 'd4') {
        return { eco: 'A40', name: "Queen's Pawn Game" };
    } else if (firstMove === 'nf3') {
        return { eco: 'A04', name: 'Reti Opening' };
    } else if (firstMove === 'c4') {
        return { eco: 'A10', name: 'English Opening' };
    }

    return {};
}

