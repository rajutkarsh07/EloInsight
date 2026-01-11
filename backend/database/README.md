# EloInsight Database

PostgreSQL database layer using Prisma ORM.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## Scripts

| Script | Description |
|--------|-------------|
| `db:generate` | Generate Prisma Client |
| `db:migrate` | Run migrations |
| `db:seed` | Seed with sample data |
| `db:studio` | Open Prisma Studio |
| `db:reset` | Reset and re-seed |

## Documentation

See [Database Design Documentation](../../docs/database-design.md) for:
- Complete schema reference
- Entity relationships
- Migration strategy
- Query examples
