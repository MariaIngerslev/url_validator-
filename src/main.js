require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const Post = require('./models/Post');
const SEED_POST = require('./data/seed');
const RALPH_LOOP_POST = require('./data/ralph-loop-post');
const SECURITY_POST = require('./data/security-post');

const PORT = process.env.PORT || 3000;

async function seedPosts() {
    await Post.deleteMany({ title: "Sådan tæmmede jeg AI'en: The Ralph Loop" });
    await Post.deleteMany({ title: 'The Ralph Wiggum Loop' });
    await Post.findOneAndUpdate({ title: SEED_POST.title }, SEED_POST, { upsert: true, new: true });
    await Post.findOneAndUpdate({ title: RALPH_LOOP_POST.title }, RALPH_LOOP_POST, { upsert: true, new: true });
    await Post.findOneAndUpdate({ title: SECURITY_POST.title }, SECURITY_POST, { upsert: true, new: true });
}

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
