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
