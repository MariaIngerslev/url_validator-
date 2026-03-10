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
