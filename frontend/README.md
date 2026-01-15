# EloInsight Frontend

Modern React + TypeScript frontend for the EloInsight chess analysis platform.

## 🛠️ Tech Stack

- **React 18** - UI library with hooks
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Router v6** - Client-side routing
- **Recharts** - Data visualization (evaluation graphs)
- **Lucide React** - Icon library
- **react-chessboard** - Interactive chess board component
- **chess.js** - Chess logic, move validation, FEN/PGN parsing
- **Sonner** - Toast notifications
- **clsx/tailwind-merge** - Conditional class utilities

## 📁 Project Structure

```
src/
├── components/          # Reusable components
│   ├── chess/          # Chess-specific components
│   │   └── ChessBoardViewer.tsx  # Interactive board with arrows & highlights
│   ├── layout/         # Layout components
│   │   └── MainLayout.tsx        # App shell with sidebar
│   └── ui/             # UI primitives (buttons, cards, etc.)
├── contexts/           # React context providers
│   ├── AuthContext.tsx          # Authentication state
│   └── GamesContext.tsx         # Games cache & state
├── pages/              # Page components (routes)
│   ├── Login.tsx               # Authentication
│   ├── Register.tsx            # User registration
│   ├── Dashboard.tsx           # Overview statistics
│   ├── GamesList.tsx           # Games table with filters
│   ├── AnalysisList.tsx        # Analyzed games list
│   ├── AnalysisViewer.tsx      # Full game analysis (main feature)
│   ├── Settings.tsx            # User settings
│   └── Profile.tsx             # User profile
├── services/           # API service layer
│   └── apiClient.ts            # Axios instance with interceptors
├── lib/                # Utility functions
│   └── utils.ts                # cn() helper for classnames
├── App.tsx             # Root component with routes
├── main.tsx            # Entry point
└── index.css           # TailwindCSS imports & global styles
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```env
   VITE_API_URL=http://localhost:4000/api/v1
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   
   App will be available at http://localhost:5173

### Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

## 🎮 Key Features

### Analysis Viewer (`AnalysisViewer.tsx`)

The main analysis page with comprehensive features:

#### Board & Navigation
- **Interactive Chess Board**: Click squares, drag pieces to explore positions
- **Exploration Mode**: Make moves to analyze alternative lines (live engine evaluation)
- **Auto-play**: Automatically advance through moves (0.5s - 3s speed options)
- **Keyboard Shortcuts**: Full navigation with hotkeys
- **Board Flip**: View from either player's perspective

#### Analysis Components
- **Evaluation Graph**: Interactive chart showing game evaluation over time
- **Move Quality Summary**: Count of brilliant/best/good/inaccuracy/mistake/blunder moves
- **Phase Breakdown**: Move quality breakdown by Opening/Middlegame/Endgame
- **Win Probability Bar**: Real-time win/draw/loss probabilities
- **Key Moments**: Auto-detected critical positions
- **Engine Lines (PV)**: Top engine continuations
- **Suggested Focus Areas**: AI-powered study recommendations
- **Game Rating**: "You played like a XXXX" performance rating

#### Move Information
- **Current Move Card**: Detailed move analysis with classification
- **Move List**: Full game notation with move highlighting
- **Time Analysis**: Time spent per move (when available)

#### Utilities
- **Copy FEN**: One-click position copying
- **Similar Games**: Links to explore position on Lichess/Chess.com
- **Sound Effects**: Audio feedback for moves

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Previous/Next move |
| `Home` / `End` | First/Last move |
| `Space` | Play/Pause auto-play |
| `F` | Flip board |
| `C` | Copy FEN |
| `M` | Toggle sound |
| `?` / `H` | Show shortcuts |
| `Esc` | Exit exploration mode |

### Games List (`GamesList.tsx`)

- **Filters**: Platform, result, time control, won by, analyzed status, date range
- **Pagination**: Navigate large game collections
- **One-click Analysis**: Start analysis directly from the list
- **Concurrent Limit**: Max 3 simultaneous analyses

### Analysis List (`AnalysisList.tsx`)

- **Analyzed Games**: View all completed analyses
- **Sorting**: Sort by analysis date
- **Quick Stats**: Accuracy, ACPL, blunder counts at a glance

## 🎨 Styling

### TailwindCSS

All styling uses Tailwind utility classes:

```tsx
<div className="bg-zinc-900 rounded-xl p-4 border border-zinc-700">
  <h2 className="text-lg font-semibold text-white">Title</h2>
</div>
```

### Color Scheme

Dark theme with zinc-based neutrals:
- **Background**: `bg-zinc-950`, `bg-zinc-900`
- **Cards**: `bg-zinc-800`, `bg-zinc-900`
- **Borders**: `border-zinc-700`, `border-zinc-600`
- **Text**: `text-white`, `text-zinc-400`

### Move Classification Colors

| Classification | Color |
|---------------|-------|
| Brilliant | `cyan-500` |
| Best | `emerald-500` |
| Good | `lime-600` |
| Book | `zinc-500` |
| Inaccuracy | `yellow-500` |
| Mistake | `orange-500` |
| Blunder | `red-500` |

### cn() Utility

Conditional classnames using `clsx` + `tailwind-merge`:

```tsx
import { cn } from '../lib/utils';

<button className={cn(
  "px-4 py-2 rounded-lg",
  isActive ? "bg-blue-500" : "bg-zinc-700",
  disabled && "opacity-50 cursor-not-allowed"
)}>
  Click me
</button>
```

## 🔐 Authentication

### Flow

1. User logs in with email/password
2. JWT tokens stored in `localStorage`
3. `AuthContext` provides auth state app-wide
4. API client interceptor adds `Authorization` header
5. Auto token refresh on 401 errors

### Protected Routes

```tsx
// In App.tsx
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/games" element={<GamesList />} />
  {/* ... */}
</Route>
```

## 📊 State Management

### Context Providers

- **AuthContext**: User authentication state, login/logout
- **GamesContext**: Games list cache, pagination, sync status

### Local State

Most components use `useState` and `useMemo` for local state management.

## 🎮 Chess Components

### ChessBoardViewer

Interactive chess board with advanced features:

```tsx
<ChessBoardViewer
  fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  interactive={true}
  bestMove="e2e4"           // Arrow for best move
  lastMove="d7d5"           // Highlight last move
  classification="blunder"  // Show classification badge
  destinationSquare="d5"    // Badge placement
  boardOrientation="white"  // View orientation
  onMove={(from, to) => {}} // Move callback
/>
```

#### Features
- Drag and drop moves
- Legal move validation (via chess.js)
- Best move arrows (green)
- Last move highlights
- Classification badges on destination squares
- Responsive sizing

## 📝 TypeScript

Strong typing throughout:

```typescript
interface MoveAnalysis {
  moveNumber: number;
  halfMove: number;
  fen: string;
  evaluation: number | null;
  mateIn: number | null;
  bestMove: string;
  playedMove: string;
  classification: string;
  centipawnLoss: number | null;
  pv: string[];
  depth: number | null;
}
```

## 🧪 Testing

Planned testing setup:
- **Vitest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** - E2E testing

## 📦 Build & Deployment

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:4000/api/v1` |

### Docker

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

## 🤝 Contributing

### Code Style

- Use TypeScript for all files
- Functional components with hooks
- TailwindCSS for styling (no CSS files)
- Keep components focused and small

### Naming Conventions

- **Components**: PascalCase (`ChessBoardViewer.tsx`)
- **Utilities**: camelCase (`apiClient.ts`)
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

## 📚 Resources

- [React Documentation](https://react.dev)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Router Docs](https://reactrouter.com/)
- [Recharts](https://recharts.org/)
- [chess.js](https://github.com/jhlywa/chess.js)

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

---

**Built with ♟️ for chess players, by chess players**
