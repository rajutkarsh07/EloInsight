# EloInsight Frontend

Modern React + TypeScript frontend for the EloInsight chess analysis platform.

## 🛠️ Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Material UI (MUI)** - Component library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **react-chessboard** - Chess board component
- **chess.js** - Chess logic and validation

## 📁 Project Structure

```
src/
├── components/          # Reusable components
│   ├── common/         # Generic UI components
│   ├── chess/          # Chess-specific components
│   │   └── ChessBoardViewer.tsx
│   └── layout/         # Layout components
│       └── MainLayout.tsx
├── pages/              # Page components (routes)
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── GamesList.tsx
│   └── AnalysisViewer.tsx
├── services/           # API service layer
│   ├── apiClient.ts    # Axios instance with interceptors
│   ├── authService.ts  # Authentication API calls
│   └── gamesService.ts # Games API calls
├── routes/             # Route configuration
│   └── index.tsx       # React Router setup
├── types/              # TypeScript type definitions
│   └── api.ts          # API response types
├── theme/              # Material UI theme
│   └── theme.ts        # Light/dark theme config
├── hooks/              # Custom React hooks (future)
├── utils/              # Utility functions (future)
├── App.tsx             # Root component
├── main.tsx            # Entry point
└── index.css           # Global styles
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
   
   Edit `.env` and configure:
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
```

Preview production build:
```bash
npm run preview
```

## 🏗️ Architecture

### Component Organization

#### **Pages** (`/pages`)
Top-level route components that compose smaller components.

- `Login.tsx` - Authentication page
- `Dashboard.tsx` - Overview with statistics
- `GamesList.tsx` - Table of user's games
- `AnalysisViewer.tsx` - Detailed game analysis

#### **Components** (`/components`)
Reusable UI components organized by category.

**Common**: Generic components (buttons, cards, modals)  
**Chess**: Chess-specific components (board, move list)  
**Layout**: App structure (header, sidebar, footer)

#### **Services** (`/services`)
API communication layer with clean abstractions.

**apiClient.ts**:
- Axios instance configuration
- Request/response interceptors
- Automatic token refresh
- Error handling

**authService.ts**:
- Login/logout
- Token management
- User profile

**gamesService.ts**:
- Fetch games
- Request analysis
- Sync with platforms

### State Management

Currently using React's built-in state management:
- `useState` for local component state
- `localStorage` for authentication tokens
- Props for component communication

**Future**: Consider adding Redux Toolkit or Zustand for global state when needed.

### Routing

React Router v6 with:
- Protected routes (require authentication)
- Nested routes (layout wrapper)
- Programmatic navigation
- URL parameters

### API Integration

**Base Configuration**:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
```

**Authentication Flow**:
1. User logs in → receives access + refresh tokens
2. Tokens stored in localStorage
3. Access token added to all requests via interceptor
4. On 401 error → auto-refresh token
5. If refresh fails → redirect to login

**Making API Calls**:
```typescript
import { gamesService } from './services/gamesService';

// Fetch games
const games = await gamesService.getGames({ page: 1, limit: 20 });

// Request analysis
const job = await gamesService.requestAnalysis(gameId);
```

### Theme Customization

Material UI theme configured in `src/theme/theme.ts`:

```typescript
import { theme, darkTheme } from './theme/theme';

// Use in ThemeProvider
<ThemeProvider theme={theme}>
  <App />
</ThemeProvider>
```

**Customization**:
- Colors (primary, secondary, etc.)
- Typography (fonts, sizes)
- Component styles (buttons, cards)
- Spacing and breakpoints

## 🎨 Styling Approach

### Material UI Components
Primary styling method using MUI's `sx` prop:

```tsx
<Box sx={{ p: 2, bgcolor: 'primary.main' }}>
  Content
</Box>
```

### Global Styles
Minimal global styles in `index.css` for:
- CSS reset
- Font loading
- Root element styles

### Component-Specific Styles
Use MUI's styling solutions:
- `sx` prop for one-off styles
- `styled()` for reusable styled components
- Theme overrides for global component styles

## 🔐 Authentication

### Login Flow

1. User enters credentials
2. `authService.login()` called
3. Tokens stored in localStorage
4. User redirected to dashboard

### Protected Routes

```tsx
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

Checks for valid token, redirects to login if missing.

### Token Refresh

Automatic token refresh on 401 errors:
1. Request fails with 401
2. Interceptor catches error
3. Attempts token refresh
4. Retries original request
5. If refresh fails → logout

## 🎮 Chess Components

### ChessBoardViewer

Interactive chess board component:

```tsx
<ChessBoardViewer
  fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  interactive={true}
  onPositionChange={(fen) => console.log(fen)}
/>
```

**Props**:
- `fen` - Position in FEN notation
- `pgn` - Game in PGN format
- `interactive` - Allow move input
- `onPositionChange` - Callback on position change

**Features**:
- Drag and drop moves
- Legal move validation
- Position display
- PGN parsing

## 📝 TypeScript Types

All API types defined in `src/types/api.ts`:

```typescript
interface Game {
  id: string;
  platform: 'chess.com' | 'lichess';
  whitePlayer: string;
  blackPlayer: string;
  result: '1-0' | '0-1' | '1/2-1/2';
  // ... more fields
}
```

**Benefits**:
- Type safety
- IntelliSense support
- Compile-time error checking
- Self-documenting code

## 🧪 Testing (Future)

Planned testing setup:
- **Vitest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** - E2E testing

## 📦 Build & Deployment

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

Output in `dist/` directory.

### Environment Variables

**Development** (`.env`):
```env
VITE_API_URL=http://localhost:4000/api/v1
```

**Production** (`.env.production`):
```env
VITE_API_URL=https://api.eloinsight.dev/api/v1
```

### Docker Build

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
CMD ["nginx", "-g", "daemon off;"]
```

## 🚧 Current Status

### ✅ Implemented
- Project structure
- Material UI theme
- Routing with protected routes
- API client with interceptors
- Authentication service
- Chess board component
- Login page
- Dashboard page
- Games list page
- Analysis viewer page

### 🔜 Next Steps
- Connect to backend API
- Add real data fetching
- Implement WebSocket for real-time updates
- Add error boundaries
- Add loading states
- Add form validation
- Add unit tests
- Add E2E tests

## 🎯 Demo Mode

Currently running in **demo mode** with:
- Mock data for all pages
- No backend connection required
- Placeholder authentication
- Static chess positions

**To connect to backend**:
1. Update `VITE_API_URL` in `.env`
2. Remove mock data from pages
3. Uncomment API calls in services

## 🤝 Contributing

See main project [CONTRIBUTING.md](../docs/contributing.md) for guidelines.

### Code Style

- Use TypeScript for all new files
- Follow React best practices
- Use functional components with hooks
- Use MUI components when possible
- Keep components small and focused
- Write self-documenting code

### Naming Conventions

- **Components**: PascalCase (`ChessBoardViewer.tsx`)
- **Files**: camelCase for utilities, PascalCase for components
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

## 📚 Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Material UI Docs](https://mui.com/material-ui/)
- [React Router Docs](https://reactrouter.com/)
- [Vite Guide](https://vitejs.dev/guide/)

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

---

**Built with ♟️ for chess players, by chess players**
