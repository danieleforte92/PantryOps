# Contributing to PantryOps

Thanks for your interest in contributing.

## Development Setup

1. Start PostgreSQL:
   - `docker-compose up -d`
2. Create backend env:
   - `cp backend/.env.example backend/.env`
3. Start backend:
   - `cd backend`
   - `bun install`
   - `bun run db:push`
   - `bun run db:seed`
   - `bun run dev`
4. Start frontend:
   - `cd frontend`
   - `bun install`
   - `bun run dev`

## Pull Request Guidelines

- Keep PRs focused and small.
- Explain behavioral changes clearly.
- Include screenshots for UI changes.
- Update docs when setup, behavior, or API contracts change.

## Suggested Validation Before PR

- Backend tests: `cd backend && bun test`
- Frontend build/typecheck: `cd frontend && bun run build`

## Scope Priorities

- Improve the golden flow end to end.
- Reduce cognitive load in key user journeys.
- Keep decision logic deterministic and explainable.
