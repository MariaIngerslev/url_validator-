/**
 * One-time update script: updates the content of the security blog post in MongoDB.
 * Idempotent — safe to run multiple times.
 *
 * Usage: node scripts/update-security-post.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../src/models/Post');
const SECURITY_POST = require('../src/data/security-post');

async function updateSecurityPost() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
        console.error('Error: MONGODB_URI environment variable is not set.');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const post = await Post.findOneAndUpdate(
        { title: SECURITY_POST.title },
        { content: SECURITY_POST.content },
        { returnDocument: 'after' }
    );

    if (!post) {
        console.log('Post not found.');
    } else {
        console.log(`Post updated successfully (id: ${post._id}).`);
    }

    await mongoose.disconnect();
}

updateSecurityPost().catch(err => {
    console.error('Failed to update post:', err.message);
    process.exit(1);
});
