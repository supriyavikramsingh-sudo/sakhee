# 🌸 Sakhee — AI-powered PCOS Management Assistant

Sakhee is an AI-driven, culturally-localized health companion focused on helping Indian women manage PCOS/PCOD. It combines a React + Vite frontend with an Express backend that leverages language models and retrieval pipelines (LangChain) for personalized chat, meal planning, report parsing, and progress tracking.

This README covers how to get the project running locally, available scripts, environment variables, and a brief overview of the code organization.

## 🚀 Quick setup (development)

Prerequisites
- Node.js >= 18
- npm (or yarn)
- OpenAI API key
- SERP API key (optional, for web-based context)
- Reddit app credentials (optional, personal script app)

1. Clone the repo and install dependencies

```bash
git clone <repo-url>
cd sakhee
npm install
```

2. Create environment files

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit the files and fill in your API keys and any other values
```

3. Start both servers (workspace script)

```bash
npm run dev
```

By default:
- Client: http://localhost:5173
- Server: http://localhost:5000

You can also start each part separately:
- Server: cd server && npm run dev
- Client: cd client && npm run dev

## Environment variables (examples)

Server (see `server/.env.example`)
- PORT=5000
- NODE_ENV=development
- OPENAI_API_KEY=your_openai_api_key_here
- SERP_API_KEY=your_serp_api_key_here
- REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET
- CORS_ORIGIN=http://localhost:5173
- MAX_FILE_SIZE_MB=10

Client (see `client/.env.example`)
- VITE_API_URL=http://localhost:5000/api
- VITE_API_TIMEOUT=30000
- VITE_APP_NAME=Sakhee

Keep secrets out of version control. Do not commit .env files with real API keys.

## Useful npm scripts (root workspace)

- npm run dev — runs client and server concurrently (development)
- npm run build — builds client and server
- npm run test — runs tests for client and server (if configured)
- npm run lint / lint:fix — linting across workspaces

Server (inside `server/`)
- npm run dev — node --watch src/index.js (auto-restarts on change)
- npm run start — node src/index.js

Client (inside `client/`)
- npm run dev — vite dev server
- npm run build — build static assets

## Project structure (high level)

- client/ — React app (Vite + Tailwind)
	- src/ — React source files (components, pages, services)

- server/ — Express backend
	- src/index.js — server entry
	- src/config — environment and app configuration
	- src/langchain — LLM, embeddings, retriever, chains, and prompts
	- src/routes — Express routes (chat, meals, upload, progress)
	- src/middleware — cors, rate-limiting, safety guards, error handler
	- src/services — OCR, parsing helpers
	- src/utils — logger, labRanges, helpers

Refer to the codebase for more detail (files are well organized under `client/src` and `server/src`).

## Testing & linting

- The repository uses `vitest` for tests in both client and server (if tests are present).
- ESLint and Prettier are configured workspace-wide. Run `npm run lint` and `npm run format` from the root.

## Development notes

- Server uses LangChain + OpenAI for chat and retrieval. Keep the OpenAI key in `server/.env`.
- Client talks to the API at `VITE_API_URL` (default: http://localhost:5000/api).
- Uploaded files and temporary storage are under `server/src/storage`.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Run tests and linting locally
4. Open a PR with a clear description of changes

If you plan to add model-heavy features, document costs and safety considerations in `docs/`.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

If you'd like, I can also:
- Add a short development checklist to the README
- Create a CONTRIBUTING.md and CODE_OF_CONDUCT
- Add a small README section that documents key HTTP endpoints and payload shapes

Tell me which of these you'd like next.