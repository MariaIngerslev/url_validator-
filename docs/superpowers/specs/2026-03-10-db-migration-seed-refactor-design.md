# Design: DB Migration & Seed Refactor

**Date:** 2026-03-10
**Status:** Approved

## Problem

`src/main.js` runs `seedPosts()` on every server startup. This function:
- Hardcodes `Post.deleteMany` calls to clean up stale post titles (fragile, title-dependent)
- Upserts posts by `title` (not stable — a title change creates a duplicate)
- Mixes startup orchestration with data management concerns

## Goal

- One-time cleanup migrations that run only once per environment
- Standalone seed script with stable, slug-based upserts
- `src/main.js` reduced to: connect → listen

---

## Architecture

### Migration Runner — `scripts/migrate.js`

- Connects to MongoDB via `MONGODB_URI`/`MONGO_URI` from `.env`
- Reads a `migrations` collection to find already-applied migration names
- Reads all files from `migrations/` sorted numerically
- Skips files already recorded in the collection
- Runs each new migration's `up(db)` function in order
- Inserts `{ name, appliedAt }` record on success
- Fails fast with non-zero exit code on any error

### Migration Files — `migrations/`

`migrations/001-remove-old-posts.js` — exports `up(db)` that calls
`db.collection('posts').deleteMany(...)` targeting the two stale titles:
- `"Sådan tæmmede jeg AI'en: The Ralph Loop"`
- `'The Ralph Wiggum Loop'`

Uses native MongoDB `db` object (`mongoose.connection.db`) — no Mongoose model needed
for a one-time destructive op.

### Seed Script — `scripts/seed.js`

- Standalone executable: connect → upsert three posts → disconnect → exit
- Upserts by `slug` (stable identifier, never changes)
- Idempotent by design: re-running never creates duplicates

### Slugs

| Data file                      | Slug                      |
|--------------------------------|---------------------------|
| `src/data/seed.js`             | `fra-ide-til-kode`        |
| `src/data/ralph-loop-post.js`  | `the-stateless-developer` |
| `src/data/security-post.js`    | `defense-in-depth`        |

### Schema — `src/models/Post.js`

Adds a `slug` field:
```js
slug: { type: String, unique: true, sparse: true }
```
`sparse: true` prevents index conflicts on existing posts without a slug.

### `src/main.js`

Removes:
- `const Post = require('./models/Post')`
- `const SEED_POST = require('./data/seed')`
- `const RALPH_LOOP_POST = require('./data/ralph-loop-post')`
- `const SECURITY_POST = require('./data/security-post')`
- `seedPosts()` function and its call inside `start()`

`start()` becomes: connect → listen only.

### `package.json` Scripts

```json
"migrate": "node scripts/migrate.js",
"db:seed":  "node scripts/seed.js"
```

Existing `update-*` scripts are untouched.

---

## Usage

```bash
# Run pending migrations (one-time cleanup ops)
npm run migrate

# Seed / re-seed the database
npm run db:seed
```

---

## Non-Goals

- No "down" migrations (rollback) — not needed for this project
- No changes to existing `scripts/update-*.js` files
- No changes to API routes or frontend
