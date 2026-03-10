# DB Migration & Seed Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the startup-time `seedPosts()` function in `src/main.js` with a custom one-shot migration runner and a standalone slug-based seed script.

**Architecture:** A custom `scripts/migrate.js` runner reads `migrations/*.js` files, checks a `migrations` MongoDB collection to skip already-applied ones, and records each run. A standalone `scripts/seed.js` upserts the three blog posts by stable `slug` field. `src/main.js` is reduced to connect → listen only.

**Tech Stack:** Node.js, CommonJS, Mongoose 9, MongoDB native driver (`mongoose.connection.db`), Jest + `mongodb-memory-server` for tests.

---

## Chunk 1: Schema + data layer

### Task 1: Add `slug` field to Post schema

**Files:**
- Modify: `src/models/Post.js`
- Create: `src/__tests__/post-slug.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/post-slug.test.js`:

```js
const Post = require('../models/Post');

describe('Post slug field', () => {
    it('saves a post with a slug', async () => {
        const post = await Post.create({ title: 'Test', content: 'Body', slug: 'test-slug' });
        expect(post.slug).toBe('test-slug');
    });

    it('rejects a duplicate slug', async () => {
        await Post.create({ title: 'A', content: 'Body', slug: 'dupe' });
        await expect(
            Post.create({ title: 'B', content: 'Body', slug: 'dupe' })
        ).rejects.toThrow();
    });

    it('allows multiple posts without a slug (sparse index)', async () => {
        await Post.create({ title: 'A', content: 'Body' });
        await Post.create({ title: 'B', content: 'Body' });
        const count = await Post.countDocuments();
        expect(count).toBe(2);
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern="post-slug"
```

Expected: FAIL — `post.slug` is `undefined`, unique constraint doesn't exist.

- [ ] **Step 3: Add the slug field to `src/models/Post.js`**

Replace the schema definition:

```js
const postSchema = new mongoose.Schema({
    title:     { type: String, required: true },
    content:   { type: String, required: true },
    heroImage: { type: String },
    slug:      { type: String, unique: true, sparse: true },
    createdAt: { type: Date, default: Date.now }
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern="post-slug"
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/models/Post.js src/__tests__/post-slug.test.js
git commit -m "feat(schema): add unique sparse slug field to Post model"
```

---

### Task 2: Add `slug` properties to the three seed data objects

**Files:**
- Modify: `src/data/seed.js`
- Modify: `src/data/ralph-loop-post.js`
- Modify: `src/data/security-post.js`

- [ ] **Step 1: Add slug to `src/data/seed.js`**

Add `slug: 'fra-ide-til-kode'` as the second property of the `SEED_POST` object (after `title`):

```js
const SEED_POST = {
    title:     'Fra Idé til Kode: Sådan byggede jeg min egen sikre Blog App',
    slug:      'fra-ide-til-kode',
    heroImage: '/images/blog/first_blog.png',
    content: `...`,
};
```

- [ ] **Step 2: Add slug to `src/data/ralph-loop-post.js`**

Add `slug: 'the-stateless-developer'` after `title`:

```js
const RALPH_LOOP_POST = {
    title:     "The Stateless Developer: Genvej til fejlfri AI-kode",
    slug:      'the-stateless-developer',
    heroImage: '/images/blog/ralph_loop.jpg',
    content: `...`,
};
```

- [ ] **Step 3: Add slug to `src/data/security-post.js`**

Add `slug: 'defense-in-depth'` after `title`:

```js
const SECURITY_POST = {
    title:     'Defense in Depth: Sådan hærdede jeg platformen lag for lag',
    slug:      'defense-in-depth',
    heroImage: '/images/blog/security.jpg',
    content: `...`,
};
```

- [ ] **Step 4: Commit**

```bash
git add src/data/seed.js src/data/ralph-loop-post.js src/data/security-post.js
git commit -m "feat(data): add stable slug identifiers to seed post objects"
```

---

## Chunk 2: Migration runner

### Task 3: Create the migration file

**Files:**
- Create: `migrations/001-remove-old-posts.js`

- [ ] **Step 1: Create the `migrations/` directory and migration file**

Create `migrations/001-remove-old-posts.js`:

```js
'use strict';

/**
 * Remove legacy post documents that existed before the title stabilisation.
 * These titles were used in early development and are now obsolete.
 */
async function up(db) {
    await db.collection('posts').deleteMany({
        title: { $in: [
            "Sådan tæmmede jeg AI'en: The Ralph Loop",
            'The Ralph Wiggum Loop'
        ]}
    });
}

module.exports = { up };
```

- [ ] **Step 2: Commit**

```bash
git add migrations/001-remove-old-posts.js
git commit -m "feat(migrations): add 001 to remove stale legacy post titles"
```

---

### Task 4: Create the migration runner

**Files:**
- Create: `scripts/migrate.js`
- Create: `src/__tests__/fixtures/migrations/001-test-migration.js`
- Create: `src/__tests__/migrate.test.js`

- [ ] **Step 1: Create the test fixture migration**

Create `src/__tests__/fixtures/migrations/001-test-migration.js`:

```js
'use strict';

async function up(db) {
    await db.collection('migration_fixture_log').insertOne({ ran: true });
}

module.exports = { up };
```

- [ ] **Step 2: Write the failing tests**

Create `src/__tests__/migrate.test.js`:

```js
const mongoose = require('mongoose');
const path = require('path');
const { runMigrations } = require('../../scripts/migrate');

const FIXTURES_DIR = path.join(__dirname, 'fixtures/migrations');

describe('runMigrations', () => {
    it('runs a new migration and records it in the migrations collection', async () => {
        const db = mongoose.connection.db;
        await runMigrations(db, FIXTURES_DIR);

        const applied = await db.collection('migrations').find({}).toArray();
        expect(applied).toHaveLength(1);
        expect(applied[0].name).toBe('001-test-migration.js');
        expect(applied[0].appliedAt).toBeInstanceOf(Date);
    });

    it('executes the migration up() function', async () => {
        const db = mongoose.connection.db;
        await runMigrations(db, FIXTURES_DIR);

        const log = await db.collection('migration_fixture_log').find({}).toArray();
        expect(log).toHaveLength(1);
        expect(log[0].ran).toBe(true);
    });

    it('skips already-applied migrations on a second run', async () => {
        const db = mongoose.connection.db;
        await runMigrations(db, FIXTURES_DIR);
        await runMigrations(db, FIXTURES_DIR);

        const applied = await db.collection('migrations').find({}).toArray();
        expect(applied).toHaveLength(1);

        const log = await db.collection('migration_fixture_log').find({}).toArray();
        expect(log).toHaveLength(1);
    });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern="migrate.test"
```

Expected: FAIL — `runMigrations` is not a function (module doesn't exist yet).

- [ ] **Step 4: Create `scripts/migrate.js`**

```js
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Runs all pending migrations in the given directory against the provided db.
 * Tracks applied migrations in the `migrations` collection.
 *
 * @param {import('mongodb').Db} db - Native MongoDB Db instance
 * @param {string} migrationsDir - Absolute path to migrations directory
 */
async function runMigrations(db, migrationsDir) {
    const migrationsCol = db.collection('migrations');
    const applied = await migrationsCol.find({}).toArray();
    const appliedNames = new Set(applied.map(m => m.name));

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.js'))
        .sort();

    for (const file of files) {
        if (appliedNames.has(file)) {
            console.log(`  skip: ${file}`);
            continue;
        }
        console.log(`  run:  ${file}`);
        const migration = require(path.join(migrationsDir, file));
        await migration.up(db);
        await migrationsCol.insertOne({ name: file, appliedAt: new Date() });
        console.log(`  done: ${file}`);
    }
}

if (require.main === module) {
    require('dotenv').config();
    const mongoose = require('mongoose');

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI is not set');
        process.exit(1);
    }

    const defaultMigrationsDir = path.join(__dirname, '..', 'migrations');

    mongoose.connect(mongoUri)
        .then(() => {
            console.log('Connected to MongoDB');
            return runMigrations(mongoose.connection.db, defaultMigrationsDir);
        })
        .then(() => {
            console.log('Migrations complete');
            return mongoose.disconnect();
        })
        .catch(err => {
            console.error('Migration failed:', err.message);
            process.exit(1);
        });
}

module.exports = { runMigrations };
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern="migrate.test"
```

Expected: PASS — all 3 tests green.

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add scripts/migrate.js src/__tests__/migrate.test.js src/__tests__/fixtures/migrations/001-test-migration.js
git commit -m "feat(migrations): add custom migration runner with tracking and tests"
```

---

## Chunk 3: Seed script + main.js cleanup

### Task 5: Create the standalone seed script

**Files:**
- Create: `scripts/seed.js`
- Create: `src/__tests__/seed.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/seed.test.js`:

```js
const Post = require('../models/Post');
const { seedPosts } = require('../../scripts/seed');

describe('seedPosts', () => {
    it('creates all three posts on first run', async () => {
        await seedPosts(Post);
        const count = await Post.countDocuments();
        expect(count).toBe(3);
    });

    it('creates posts with the correct slugs', async () => {
        await seedPosts(Post);
        const slugs = (await Post.find({}, 'slug').lean()).map(p => p.slug).sort();
        expect(slugs).toEqual([
            'defense-in-depth',
            'fra-ide-til-kode',
            'the-stateless-developer',
        ]);
    });

    it('is idempotent — re-running does not create duplicates', async () => {
        await seedPosts(Post);
        await seedPosts(Post);
        const count = await Post.countDocuments();
        expect(count).toBe(3);
    });

    it('upserts by slug so a title change does not create a duplicate', async () => {
        await seedPosts(Post);
        await Post.updateOne({ slug: 'fra-ide-til-kode' }, { $set: { title: 'Changed Title' } });
        await seedPosts(Post);
        const count = await Post.countDocuments();
        expect(count).toBe(3);
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern="seed.test"
```

Expected: FAIL — `seedPosts` is not a function.

- [ ] **Step 3: Create `scripts/seed.js`**

```js
'use strict';

const SEED_POST = require('../src/data/seed');
const RALPH_LOOP_POST = require('../src/data/ralph-loop-post');
const SECURITY_POST = require('../src/data/security-post');

const POSTS = [SEED_POST, RALPH_LOOP_POST, SECURITY_POST];

/**
 * Upserts the three canonical blog posts by slug.
 * Safe to run multiple times — never creates duplicates.
 *
 * @param {import('mongoose').Model} PostModel - The Mongoose Post model
 */
async function seedPosts(PostModel) {
    for (const post of POSTS) {
        await PostModel.findOneAndUpdate(
            { slug: post.slug },
            { $set: post },
            { upsert: true, new: true }
        );
    }
}

if (require.main === module) {
    require('dotenv').config();
    const mongoose = require('mongoose');
    const Post = require('../src/models/Post');

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI is not set');
        process.exit(1);
    }

    mongoose.connect(mongoUri)
        .then(() => {
            console.log('Connected to MongoDB');
            return seedPosts(Post);
        })
        .then(() => {
            console.log('Seeding complete');
            return mongoose.disconnect();
        })
        .catch(err => {
            console.error('Seeding failed:', err.message);
            process.exit(1);
        });
}

module.exports = { seedPosts };
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern="seed.test"
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed.js src/__tests__/seed.test.js
git commit -m "feat(seed): add standalone slug-based seed script with tests"
```

---

### Task 6: Remove `seedPosts` from `src/main.js`

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Remove seed-related code from `src/main.js`**

The `start()` function should become connect → listen only. Remove:
- The three `require` calls for seed data (`SEED_POST`, `RALPH_LOOP_POST`, `SECURITY_POST`)
- The `const Post = require('./models/Post')` import
- The entire `seedPosts()` function definition
- The `await seedPosts()` call inside `start()`

Final `src/main.js`:

```js
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;

async function start() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
        console.error('MONGODB_URI environment variable is not set');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
}

start();
```

- [ ] **Step 2: Run full test suite to confirm nothing broke**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "refactor(main): remove seedPosts — seeding is now a standalone script"
```

---

### Task 7: Add npm scripts to `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `migrate` and `db:seed` scripts**

In the `"scripts"` block of `package.json`, add:

```json
"migrate": "node scripts/migrate.js",
"db:seed": "node scripts/seed.js"
```

The full scripts block becomes:

```json
"scripts": {
    "test": "jest",
    "start": "node src/main.js",
    "migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "envlog": "node sandbox/envlog.js",
    "update-first-post": "node scripts/update-first-post.js",
    "update-ralph-loop-post": "node scripts/update-ralph-loop-post.js",
    "update-security-post": "node scripts/update-security-post.js"
}
```

- [ ] **Step 2: Run full test suite one final time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add migrate and db:seed npm scripts"
```

---

## Summary of new files

| Path | Purpose |
|------|---------|
| `migrations/001-remove-old-posts.js` | One-time removal of stale legacy post titles |
| `scripts/migrate.js` | Migration runner — reads `migrations/`, skips applied, records runs |
| `scripts/seed.js` | Standalone seeder — upserts 3 posts by slug |
| `src/__tests__/migrate.test.js` | Integration tests for the migration runner |
| `src/__tests__/seed.test.js` | Integration tests for the seed script |
| `src/__tests__/fixtures/migrations/001-test-migration.js` | Test fixture migration |
| `src/__tests__/post-slug.test.js` | Unit tests for Post slug schema field |

## Summary of modified files

| Path | Change |
|------|--------|
| `src/models/Post.js` | Added `slug: { type: String, unique: true, sparse: true }` |
| `src/data/seed.js` | Added `slug: 'fra-ide-til-kode'` |
| `src/data/ralph-loop-post.js` | Added `slug: 'the-stateless-developer'` |
| `src/data/security-post.js` | Added `slug: 'defense-in-depth'` |
| `src/main.js` | Removed `seedPosts()` and all seed-related imports |
| `package.json` | Added `migrate` and `db:seed` scripts |
