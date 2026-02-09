const express = require('express');
const Post = require('../models/Post');

const router = express.Router();

// GET /api/posts - Return all posts
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch posts.' });
    }
});

// GET /api/posts/latest - Return the most recent post
router.get('/latest', async (req, res) => {
    try {
        const post = await Post.findOne().sort({ createdAt: -1 });
        if (!post) {
            return res.status(404).json({ error: 'No posts found.' });
        }
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch latest post.' });
    }
});

// POST /api/posts - Create a new post
router.post('/', async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                error: "Both 'title' and 'content' are required."
            });
        }

        const post = await Post.create({ title, content });
        res.status(201).json(post);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create post.' });
    }
});

module.exports = router;
