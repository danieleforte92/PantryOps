# PantryOps

Modern home inventory management system - a simplified, user-friendly alternative to Grocy.

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) runtime
- [Docker](https://www.docker.com/) for PostgreSQL

### Development

1. Start the database:
```bash
docker-compose up -d
```

2. Setup backend:
```bash
cd backend
bun install
bun run db:push
bun run db:seed
bun run dev
```

3. Setup frontend:
```bash
cd frontend
bun install
bun run dev
```

## Architecture

- **Backend**: Fastify + Prisma + TypeScript
- **Frontend**: Vite + React + TypeScript
- **Database**: PostgreSQL
- **Runtime**: Bun

## Key Features (MVP)

- 📷 Barcode scanning with OpenFoodFacts integration
- 📦 Stock management with FEFO (First Expired, First Out)
- ⏰ Expiring items alerts
- 🛒 Auto-generated shopping list
