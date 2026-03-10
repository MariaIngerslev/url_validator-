'use strict';

async function up(db) {
    await db.collection('migration_fixture_log').insertOne({ ran: true });
}

module.exports = { up };
