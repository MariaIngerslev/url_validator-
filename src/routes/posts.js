const express = require('express');
const store = require('../data/store');

const router = express.Router();

// GET /api/posts - Return all posts
router.get('/', (req, res) => {
    res.json(store.getPosts());
});

// POST /api/posts - Create a new post
router.post('/', (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({
            error: "Both 'title' and 'content' are required."
        });
    }

    const post = store.addPost({ title, content });
    res.status(201).json(post);
});

module.exports = router;
