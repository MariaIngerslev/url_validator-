const express = require('express');
const mongoose = require('mongoose');
const { validateUrls } = require('../urlvalidator');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

const router = express.Router();

// Extract URLs from text
function extractUrls(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.match(urlPattern) || [];
}

// GET /api/comments/:postId - Return comments for a specific post
router.get('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ error: 'Invalid post ID.' });
        }

        const comments = await Comment.find({ postId }).sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch comments.' });
    }
});

// POST /api/comments - Add a comment
router.post('/', async (req, res) => {
    try {
        const { postId, author, text } = req.body;

        if (!postId || !text) {
            return res.status(400).json({
                error: "'postId' and 'text' are required."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ error: 'Invalid post ID.' });
        }

        // Validate that the post exists
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                error: `Post with id ${postId} not found.`
            });
        }

        // Check URLs in the comment text
        const foundUrls = extractUrls(text);
        if (foundUrls.length > 0) {
            const results = validateUrls(foundUrls);
            const allSafe = results.every((r) => r.safe);
            if (!allSafe) {
                const unsafeUrls = results.filter((r) => !r.safe).map((r) => r.url);
                return res.status(400).json({
                    error: `Comment contains unsafe links: ${unsafeUrls.join(', ')}`,
                    unsafeUrls
                });
            }
        }

        const comment = await Comment.create({ content: text, postId });
        res.status(201).json(comment);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create comment.' });
    }
});

module.exports = router;
