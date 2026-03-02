/**
 * One-time update script: updates the content of the first seed blog post in MongoDB.
 * Idempotent — safe to run multiple times.
 *
 * Usage: node scripts/update-first-post.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../src/models/Post');
const SEED_POST = require('../src/data/seed');

async function updateFirstPost() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
        console.error('Error: MONGODB_URI environment variable is not set.');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const post = await Post.findOneAndUpdate(
        { title: SEED_POST.title },
        { content: SEED_POST.content },
        { returnDocument: 'after' }
    );

    if (!post) {
        console.log('Post not found.');
    } else {
        console.log(`Post updated successfully (id: ${post._id}).`);
    }

    await mongoose.disconnect();
}

updateFirstPost().catch(err => {
    console.error('Failed to update post:', err.message);
    process.exit(1);
});
