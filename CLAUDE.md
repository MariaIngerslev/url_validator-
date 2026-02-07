# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Start server:** `npm start` (runs `node src/main.js`, serves on http://localhost:3000)
- **Install dependencies:** `npm install`
- No test runner or linter is configured yet.

## Architecture

This is a Danish-language blog app with comment URL validation, built as an Express 5 SPA.

**Backend** (`src/main.js`): Express server that serves static files from `public/` and has a fallback route sending `index.html`. The server currently has no API endpoints — URL validation logic is stubbed out.

**Frontend** (`public/`): Single-page app with client-side view switching (no router library). Two views are toggled via `display: none/block`:
- `view-home`: Blog post list
- `view-post`: Full post with comment form

**`public/client.js`**: Handles SPA navigation, comment form submission, URL extraction from comment text via regex (`extractUrls`), and placeholder feedback messages. When URLs are found in a comment, it shows a warning and is intended to call a server-side validation endpoint (not yet implemented).

**`src/urlvalidator.js`**: Empty file, intended to hold the server-side URL validation logic.

## Key context

- Uses CommonJS modules (`"type": "commonjs"` in package.json)
- Express 5 (not 4) — note API differences (e.g., `req.query` returns a getter, path-to-regexp v8)
- UI text is in Danish
