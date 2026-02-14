const express = require('express');
const Post = require('../models/Post');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.get('/', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
});

// Defined before /:id to avoid being caught by the param route
router.get('/latest', async (req, res) => {
    const latestPost = await Post.findOne().sort({ createdAt: -1 });
    if (!latestPost) {
        return res.status(404).json({ error: 'No posts found.' });
    }
    res.json(latestPost);
});

router.get('/:id', validateObjectId('id'), async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
    }
    res.json(post);
});

router.post('/', async (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({
            error: "Both 'title' and 'content' are required."
        });
    }

    const post = await Post.create({ title, content });
    res.status(201).json(post);
});

module.exports = router;
