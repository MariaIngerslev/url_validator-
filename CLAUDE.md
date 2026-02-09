# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Start server:** `npm start` (runs `node src/main.js`, serves on http://localhost:3000)
- **Install dependencies:** `npm install`
- **Run tests:** `npm test` (Jest)
- **Security scan:** `python3 .claude/vibe-security-checker/scripts/scan_security.py . --full`

## Architecture

This is a Danish-language blog app with comment URL validation, built as an Express 5 SPA.

**Backend** (`src/main.js`): Express server entry point. Serves static files from `public/`, parses JSON bodies, connects to MongoDB via Mongoose, seeds initial blog post data, and mounts route modules. No route handlers are defined inline — all API logic lives in `src/routes/`.

**Mongoose models** (`src/models/`):
- `Post.js` — Schema: `title` (String, required), `content` (String, required), `createdAt` (Date, default now).
- `Comment.js` — Schema: `content` (String, required), `postId` (ObjectId, ref: 'Post', required), `createdAt` (Date, default now).

**Route modules** (`src/routes/`):
- `api.js` — `POST /api/validate-urls`: delegates to the validator module.
- `posts.js` — `GET /api/posts`, `GET /api/posts/latest`, `POST /api/posts`: blog post CRUD using the Post model.
- `comments.js` — `POST /api/comments`, `GET /api/comments/:postId`: comments with URL safety checking, ObjectId validation, and post-existence validation (404 if post not found). Uses the Comment and Post models.

**Frontend** (`public/`): Single-page app with client-side view switching (no router library). Two views are toggled via `display: none/block`:
- `view-home`: Blog post list
- `view-post`: Full post with comment form

**`public/client.js`**: Handles SPA navigation, comment form submission, URL extraction from comment text via regex (`extractUrls`), and calls `POST /api/validate-urls` to check found URLs. Displays green/red feedback based on results.

**`src/urlvalidator.js`**: Mock URL validator with a hardcoded domain blacklist and random safe/unsafe simulation for non-blacklisted URLs. Exports `validateUrls(urls)` returning `{ url, safe, reason }` per URL. Hostname matching is case-insensitive.

## Key context

- Uses CommonJS modules (`"type": "commonjs"` in package.json)
- Express 5 (not 4) — note API differences (e.g., `req.query` returns a getter, path-to-regexp v8)
- MongoDB via Mongoose for data persistence; connection string from `MONGODB_URI` env var (falls back to `MONGO_URI`)
- `.env` file holds the connection string (git-ignored)
- Route handlers use `async/await` with `try/catch` for error handling
- UI text is in Danish
