# AI Providers (Backend)

This folder contains optional AI integrations for PantryOps. AI features are **disabled by default**.

## Environment Variables

- `AI_ENABLED`: set to `true` to enable AI endpoints.
- `AI_PROVIDER`: provider identifier (defaults to `gemma3n:e4b`).
- `OLLAMA_BASE_URL`: Ollama API base URL (defaults to `http://localhost:11434`).
- `OLLAMA_TIMEOUT_MS`: timeout in milliseconds (defaults to `30000`).
- `OLLAMA_MODEL`: override the model name (defaults to `gemma3n:e4b`).

## Available Providers

- `gemma3n:e4b` via Ollama (default)
- any other provider name (treated as an Ollama model name)

## Endpoints

When `AI_ENABLED=true`:

- `POST /api/ai/recipe-draft`
- `POST /api/ai/category-suggest`
- `POST /api/ai/explain-preview`

Each endpoint validates input and returns a safe fallback response if the provider fails.
