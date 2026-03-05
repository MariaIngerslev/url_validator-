# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Start server:** `npm start` (runs `node src/main.js`, serves on http://localhost:3000)
- **Install dependencies:** `npm install`
- **Run tests:** `npm test` (Jest)
- **Security scan:** `python3 .claude/vibe-security-checker/scripts/scan_security.py . --full`

## Architecture

This is a Danish-language blog app with comment URL validation, built as an Express 5 SPA.

**Backend — App factory** (`src/app.js`): Creates and configures the Express app. Applies security headers via `helmet` (CSP, referrer policy), cross-origin mutation protection (rejects non-allowlisted `Origin`/`Referer` on mutating API requests), rate limiting (`commentLimiter`: 10 req/min, `messageLimiter`: 5 req/min — disabled when `NODE_ENV=test`), static file serving, JSON body parsing, and mounts all route modules. Exports `app` for use by `main.js` and tests. No business logic or domain decisions here.

**Backend — Entry point** (`src/main.js`): Connects to MongoDB, seeds initial posts, and calls `app.listen()`. Its sole responsibility is startup orchestration. All Express wiring lives in `src/app.js`.

**Mongoose models** (`src/models/`):
- `Post.js` — Schema: `title` (String, required), `content` (String, required), `heroImage` (String, optional), `createdAt` (Date, default now).
- `Comment.js` — Schema: `name` (String, default: 'Anonym'), `content` (String, required), `postId` (ObjectId, ref: 'Post', required, indexed), `createdAt` (Date, default now).
- `Message.js` — Schema: `firstName` (String, required), `lastName` (String, required), `email` (String, required), `message` (String, required), `createdAt` (Date, default now).

**Shared utilities and middleware** (`src/utils/`, `src/middleware/`, `src/data/`):
- `utils/extractUrls.js` — Shared URL extraction via a strict, non-greedy regex that avoids capturing HTML attributes and terminal punctuation. Used by both server-side routes and the client. **The URL regex in `public/client.js` MUST be kept perfectly synchronised with `src/utils/extractUrls.js` at all times** — any divergence will cause validation mismatches between the frontend and backend.
- `middleware/validateObjectId.js` — Reusable Express middleware for MongoDB ObjectId param validation.
- `data/seed.js` — Initial blog post seed content, separated from entry point.
- `data/ralph-loop-post.js` — Second blog post seed ("The Ralph Loop").
- `data/security-post.js` — Third blog post seed (security hardening). All three seed files are loaded in `main.js` via `findOneAndUpdate` with `upsert: true`.

**Route modules** (`src/routes/`):
- `api.js` — `POST /api/validate-urls`: delegates to the validator module, returns `{ allSafe, results }` where each result has `{ url, safe, reason }`.
- `posts.js` — `GET /api/posts`, `GET /api/posts/latest`, `GET /api/posts/:id`, `POST /api/posts`: blog post CRUD using the Post model. Uses `validateObjectId` middleware.
- `comments.js` — `POST /api/comments`, `GET /api/comments/:postId`: comments with URL safety checking, ObjectId validation via middleware, and post-existence validation (404 if post not found). Uses shared `extractUrls` utility.
- `messages.js` — `POST /api/messages`: contact form submissions. All four fields (`firstName`, `lastName`, `email`, `message`) are required non-empty strings; validates with strict type checking before persisting via the Message model.

**Frontend** (`public/`): Single-page app with History API-based client-side router (no framework). Five views toggled via `display: none/block`:
- `view-home` (`/`): Landing page with hero section and latest post
- `view-blogposts` (`/blogposts`): Full blog post list
- `view-post` (`/posts/:id`): Full post with comments and comment form
- `view-contact` (`/contact`): Contact form page
- `view-cv` (`/cv`): CV / "Om mig" page

**`public/client.js`**: Implements a custom SPA router using `pushState`/`popstate` with pre-compiled route patterns. Global click delegation intercepts internal `<a>` tags and calls `closeMobileMenu()` on every navigation. Uses DocumentFragment for batch DOM updates. Shared helpers: `el()` for DOM element creation, `formatDate()` for Danish locale dates, `extractExcerpt()` for post previews, `createBlogCard()` for home view cards, and `sanitizeHtml()` for safe rendering of trusted blog HTML content. `sanitizeHtml()` uses `DOMParser` and a whitelist of allowed tags (`P`, `H1`–`H6`, `UL`, `OL`, `LI`, `STRONG`, `EM`, `CODE`, `PRE`, `BR`, `A`, `BLOCKQUOTE`, `IMG`) — only `https?://` hrefs and `/`- or `https://`-prefixed `src` attributes are forwarded. Handles comment form submission with `postId` from the current route, URL extraction via regex (`extractUrls`), and client-side URL safety checking via `POST /api/validate-urls`. Mobile navigation is implemented with a hamburger button (`.nav-hamburger`) that toggles `.is-open` on `.header-nav` and manages `aria-expanded`. A server-side catch-all route in `app.js` serves `index.html` for all non-API paths to support direct URL access and page refresh.

**Separation of Concerns in `client.js`:** Although all client code resides in a single file, maintain a strict logical separation between **Data Access** (all `fetch` calls and response handling) and **DOM Manipulation** (element creation, rendering, event binding). Keep data-fetching functions pure of DOM side-effects, and keep rendering functions free of network calls. This makes the code easier to reason about, test, and refactor.

**Frontend Standards for `client.js`:**
- **Input trimming:** Always call `.trim()` on user input values before using or submitting them.
- **Optional fields:** Pass empty optional fields (e.g. `name`) as `undefined` or omit them from the payload entirely — never as empty strings. This ensures Mongoose schema defaults (e.g. `'Anonym'`) are triggered correctly.
- **Fetch error handling:** Always check `!response.ok` explicitly after every `fetch` call before attempting to parse the JSON body. Never assume a response is successful based solely on the absence of a network error.

**`src/urlvalidator.js`**: Deterministic URL validator with a Set-based domain blacklist and keyword-based detection. Blacklist terms are matched against the entire URL string (not just hostname), catching threats in paths like `example.com/virus.exe`. URLs containing "unsafe" or "risky" keywords are flagged as malicious. Internal `classifyUrl` helper per URL; exports `validateUrls(urls)` returning `[{ url, safe, reason }]` where reason is `'blacklisted'`, `'malicious'`, `'safe'`, or `'malformed'`. All matching is case-insensitive.

## Express 5 Best Practices

- Uses Express 5 (not 4) — note API differences (e.g., `req.query` returns a getter, path-to-regexp v8).
- **Do not wrap route handlers in `try/catch` for standard error passing.** Express 5 natively handles rejected promises from `async` route handlers by forwarding the error to the error-handling middleware. Rely on this built-in behaviour to reduce boilerplate. Only use `try/catch` when you need to handle a specific error locally (e.g., returning a custom 404).
- Route handlers use `async/await`; let unhandled rejections propagate to Express's error pipeline.
- **Strict type validation for incoming JSON payloads:** Always verify that fields from `req.body` are the expected primitive type (e.g. `typeof req.body.text === 'string'`) before using them. Mongoose does not protect against non-string values being passed where strings are expected — they can cause unexpected crashes or, in the case of objects, potential NoSQL injection. Reject requests with `400 Bad Request` if the payload does not conform.

## Testing

- **Unit tests:** `src/urlvalidator.js` and `src/utils/extractUrls.js` are unit-tested in `src/urlvalidator.test.js` and `src/utils/extractUrls.test.js`.
- **Integration tests:** `src/__tests__/` contains Express integration tests using `supertest` and `mongodb-memory-server`. Each test file imports `src/app.js` directly. Shared lifecycle (MongoMemoryServer connect/disconnect, per-test collection wipe) is in `src/__tests__/setup.js`, registered via Jest `setupFilesAfterEnv`. Rate limiters are automatically disabled when `NODE_ENV=test`.
- **All future utility modules must ship with Jest unit tests.** Tests must cover:
  - **Edge cases and boundary conditions:** e.g. URLs with trailing punctuation (`.`, `,`, `)`, `"`), embedded URLs in prose, and empty input.
  - **Type-safety:** passing `null`, `undefined`, numbers, objects, and other non-string values — these must not throw unhandled exceptions.
  - **IDNs (Internationalized Domain Names):** URLs containing non-ASCII characters in the hostname.
  - **Case-insensitivity:** confirm that matching behaves identically for mixed-case inputs.
- Run tests with `npm test` before committing changes to any utility.

## Coding Standards

- **Language:** UI-facing text is in Danish. All code, variable names, and comments are in English.
- **Security:** Prefer the `el()` helper for DOM element creation over `innerHTML` to prevent XSS. Never inject unsanitised user input into the DOM.
- **Clean Code — SRP:** Each function and module should have a single, well-defined responsibility. Extract logic into focused helpers rather than building large, multi-purpose functions.
- **Clean Code — Naming:** Use descriptive, intention-revealing names for variables, functions, and files. Avoid abbreviations and generic names like `data`, `temp`, or `result` when a more specific name is available.

## Key Context

- Uses CommonJS modules (`"type": "commonjs"` in package.json)
- MongoDB via Mongoose for data persistence; connection string from `MONGODB_URI` env var (falls back to `MONGO_URI`)
- `.env` file holds the connection string (git-ignored)
