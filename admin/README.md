# EloInsight Admin Panel

A comprehensive admin dashboard for managing the EloInsight chess analysis platform.

## Features

- **Dashboard**: Real-time statistics and activity monitoring
- **User Management**: Full CRUD operations, activate/deactivate users
- **Games Management**: View, delete, and requeue games for analysis
- **Analysis Management**: View analysis results, delete analyses
- **Linked Accounts**: Manage platform connections (Chess.com, Lichess)
- **Sync Jobs**: Monitor and control game synchronization jobs
- **Analysis Jobs**: Manage analysis queue, priorities, and retries
- **Settings**: Configure system parameters

## Tech Stack

- **React 19** with TypeScript
- **Vite** for blazing fast development
- **TanStack Query** for data fetching and caching
- **TanStack Table** for powerful data tables
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide Icons** for iconography
- **Sonner** for toast notifications

## Getting Started

### Prerequisites

- Node.js 18+
- API Gateway running on port 4000

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The admin panel will be available at `http://localhost:3001`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | API Gateway URL | `http://localhost:4000/api/v1` |

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Project Structure

```
admin/
├── src/
│   ├── components/
│   │   ├── Layout/          # Sidebar, Header, Layout
│   │   └── ui/              # Reusable UI components
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── pages/               # Page components
│   ├── services/
│   │   └── api.ts           # API client and endpoints
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   ├── App.tsx              # Main app with routing
│   ├── index.css            # Global styles
│   └── main.tsx             # Entry point
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Authentication

The admin panel requires authentication. Login with admin credentials to access the dashboard.

For development, you can bypass authentication by setting a token in localStorage:

```javascript
localStorage.setItem('admin_token', 'your_jwt_token');
```

## API Endpoints

The admin panel connects to the following API endpoints:

- `GET /api/v1/admin/dashboard/stats` - Dashboard statistics
- `GET/POST/PATCH/DELETE /api/v1/admin/users` - User management
- `GET/PATCH/DELETE /api/v1/admin/games` - Game management
- `GET/DELETE /api/v1/admin/analysis` - Analysis management
- `GET/PATCH/DELETE /api/v1/admin/linked-accounts` - Linked accounts
- `GET/POST /api/v1/admin/sync-jobs` - Sync job management
- `GET/POST/PATCH /api/v1/admin/analysis-jobs` - Analysis job management
- `GET/POST /api/v1/admin/statistics` - Statistics management

## License

Part of EloInsight project.
