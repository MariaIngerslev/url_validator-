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
