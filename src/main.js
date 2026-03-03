require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const Post = require('./models/Post');
const SEED_POST = require('./data/seed');
const RALPH_LOOP_POST = require('./data/ralph-loop-post');
const apiRoutes = require('./routes/api');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');
const messagesRoutes = require('./routes/messages');

const app = express();
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, '../public');

async function seedPosts() {
    await Post.findOneAndUpdate({ title: SEED_POST.title }, SEED_POST, { upsert: true, new: true });
    await Post.findOneAndUpdate({ title: RALPH_LOOP_POST.title }, RALPH_LOOP_POST, { upsert: true, new: true });
}

// Middleware
app.use(express.static(PUBLIC_DIR));
app.use(express.json());

// API routes
app.use('/api', apiRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/messages', messagesRoutes);

// SPA catch-all: serve index.html for any non-API route
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

async function start() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
        console.error('MONGODB_URI environment variable is not set');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');
        await seedPosts();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
}

start();
