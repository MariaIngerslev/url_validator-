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
