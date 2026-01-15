# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Frontend
- **Phase Breakdown**: Move quality breakdown by game phase (Opening/Middlegame/Endgame) with visual icons
- **Auto-play Mode**: Automatically advance through moves with adjustable speed (0.5s - 3s)
- **Keyboard Shortcuts**: Full navigation with hotkeys (←/→, Space, F, C, M, ?, Esc)
- **Keyboard Shortcuts Panel**: Modal showing all available shortcuts (press ? or H)
- **Move Sounds**: Audio feedback for moves, captures, checks, and blunders
- **Suggested Focus Areas**: AI-powered study recommendations based on mistakes
- **Win Probability Bar**: Real-time win/draw/loss probability visualization
- **Key Moments Detection**: Auto-highlight blunders, turning points, and brilliant moves
- **Engine Lines (PV)**: Display top engine continuations with evaluations
- **Time Analysis**: Time spent per move with statistics (when available)
- **Similar Games**: Quick links to explore positions on Lichess/Chess.com
- **Copy FEN**: One-click FEN copying for any position
- **Exploration Mode**: Make moves on the board to analyze alternative lines
- **Game Rating Display**: "You played like a XXXX" performance rating with skill descriptions
- **Interactive Evaluation Graph**: Click to navigate to any position
- **Move Quality Summary**: Count of brilliant/best/good/inaccuracy/mistake/blunder moves
- **Board Flip**: View from either player's perspective

### Added - Backend
- Docker development environment with docker-compose
- GitHub Actions CI/CD pipeline
- Issue and PR templates
- Security policy (SECURITY.md)
- Comprehensive documentation
- API Gateway with JWT authentication
- Game Sync Service for Chess.com and Lichess
- Stockfish Analysis Service (Go gRPC)
- Evaluation module with accuracy calculations
- PostgreSQL database with Prisma ORM

### Added - Infrastructure
- Multi-service Docker setup
- Makefile for common commands
- Environment configuration templates

### Changed
- Updated frontend to use TailwindCSS (replaced Material UI)
- Improved move classification icons to match Chess.com style
- Reorganized analysis viewer layout for better UX
- Navigation controls split into two rows to prevent overflow

### Fixed
- Player color indicators now use visual squares instead of emoji circles
- Phase breakdown icons enlarged for better visibility

## [0.1.0] - TBD

### Added
- Initial alpha release
- Core analysis features
- User authentication
- Game synchronization

---

## Release Notes Format

### Added
For new features.

### Changed
For changes in existing functionality.

### Deprecated
For soon-to-be removed features.

### Removed
For now removed features.

### Fixed
For any bug fixes.

### Security
For vulnerability fixes.
