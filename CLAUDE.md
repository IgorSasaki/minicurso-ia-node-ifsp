# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Rota Tech**: a teaching project for a mini-course ("Desenvolvimento de Aplicações Inteligentes com Node.js e IA Generativa", IFSP Araraquara). It is a career-mentor API in Node.js + TypeScript using Google Gemini (`@google/genai`). It has three AI features: `/chat` (+ `/chat/stream`), `/career-plan` (structured JSON output) and `/ask` (RAG with cited sources). A no-build vanilla JS front-end is served from `public/`.

The audience is students, so the code is deliberately didactic. Every file opens with a Portuguese doc comment explaining the *why*, and inline comments teach concepts. Keep that style when you edit: the comment density is high on purpose.

## Commands

pnpm (version pinned via `packageManager`, use `corepack enable`) on Node ≥ 22. There is no build step: `tsx` runs TypeScript directly, and `tsc` only typechecks (`noEmit`).

```bash
pnpm dev                 # API + front at http://localhost:3333 (tsx watch, loads .env)
pnpm check               # typecheck + lint + test — same as CI
pnpm test                # vitest run (no API key or network needed)
pnpm vitest run test/unit/rag.test.ts          # single file
pnpm vitest run -t "nome do teste"             # single test by name
pnpm lint / pnpm format  # Biome check / check --write
pnpm ingest              # rebuild data/index.json from data/documents/*.md (calls Gemini)
pnpm hello / pnpm similarity   # standalone demo scripts for stages 1 and 4
```

The server needs `.env` with `GEMINI_API_KEY` (copy `.env.example`). It also refuses to start if `data/index.json` is missing or was built with a different embedding model or dimension.

## Architecture

**Dependency injection is the core pattern.** It keeps the tests free of keys and network:
- `src/ai/llm.ts`: `createLlm(client, cfg)` returns `{ chat, chatJson, chatStream }`. It takes a `GeminiClient` (`Pick<GoogleGenAI, 'models'>`) as a parameter.
- `src/ai/gemini.ts`: the **only** file that builds the real client or touches the API key (timeout and retries are set here). It exports `llm` and `embed`.
- `src/config/config.ts`: reads `process.env` at import time and calls `process.exit(1)` on invalid config. **Tests must never import it** (directly or via `gemini.ts`). Use the pure `parseEnv()` from `env.ts` instead.
- `src/app.ts`: `buildApp({ llm, retrieve, modelName })` assembles Fastify without listening. `server.ts` wires the real deps and calls `listen`. Integration tests call `app.inject()` with the fakes from `test/helpers/fakes.ts` (`fakeGeminiClient`, `fakeLlm`, `fakeRetriever`).

**HTTP layer** (`src/http/`):
- Routes are Fastify plugins that receive deps through plugin options.
- Request bodies are zod schemas, plugged in via `zodValidatorCompiler`.
- AI routes opt into rate limiting with `config: { rateLimit: AI_RATE_LIMIT }`; the plugin is registered with `global: false`.
- `setErrorHandler(handleError)` must be registered **before** the routes, because plugins inherit the handler that is active when they register.
- `handleError` maps errors to safe user messages in the form `{ error }`: zod → 400, `HttpError` → its own status, Gemini `ApiError` → 429/503/502, `InvalidResponseError` → 502, timeout → 504. Internal details go only to the log.

**Structured output**: `chatJson(messages, zodSchema)` turns the schema into `responseJsonSchema` and validates the reply with zod. On failure it retries once, sending the validation error back to the model, then throws `InvalidResponseError`. The career-plan contract lives in `src/schemas/career-plan.ts`.

**RAG pipeline** (`src/rag/`):
- Ingestion is offline (`scripts/ingest.ts`). `chunker.ts` makes one chunk per `## ` section, splitting long sections into windows (1200 chars, 200 overlap). `embeddings.ts` produces 768-dim vectors. `vector-store.ts` writes `data/index.json`, which is zod-validated and stores the model and dimensions.
- At query time, `retriever.ts` does a brute-force cosine search with `MIN_SCORE = 0.58` and returns the top 4.
- If nothing passes the threshold, `/ask` returns `NOT_FOUND_ANSWER` without calling the LLM.
- Prompts (mentor persona, RAG rules, numbered-passage prompt) live in `src/ai/prompts.ts`.
- If you change the embedding model or the corpus, rerun `pnpm ingest`. A new embedding model also means recalibrating `MIN_SCORE`.

**Front-end** (`public/js/`): native ES modules with no bundler. `main.js` wires everything; `api.js` holds the JSON fetch helpers, while `chat.js` reads `/chat/stream` directly with a stream reader; `format.js` has pure formatting and escaping helpers, unit-tested in `test/unit/front-format.test.ts`. User and AI text must go through `escapeHtml` (the XSS concern is covered in stage 7).

## Course stages

Each stage is a commit with a git tag `etapa-01` … `etapa-07`; `main` is stage 8 (tests, lint, CI). Each stage has a guide in `docs/steps/NN-*.md`, and the instructor material is in `docs/teaching/`. If a change alters behavior that a stage guide or the README describes (routes, error table, env vars, scripts, test count badge), update those docs too. Don't rewrite history behind the tags without being asked.

## Conventions

- Identifiers in English: `camelCase` functions and variables, `PascalCase` types, `UPPER_SNAKE_CASE` constants, `kebab-case` file names.
- Comments, log messages and user-facing strings in **Portuguese**.
- Imports use explicit `.ts` extensions (`allowImportingTsExtensions`, `verbatimModuleSyntax`, so use `import type` for types). `noUncheckedIndexedAccess` is on.
- Biome: single quotes, no semicolons, trailing commas, 2-space indent, 120 columns; non-null assertions (`!`) are errors.
