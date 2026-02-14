const express = require('express');
const mongoose = require('mongoose');
const { validateUrls } = require('../urlvalidator');
const extractUrls = require('../utils/extractUrls');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.get('/:postId', validateObjectId('postId'), async (req, res) => {
    const comments = await Comment.find({ postId: req.params.postId }).sort({ createdAt: -1 });
    res.json(comments);
});

router.post('/', async (req, res) => {
    const { postId, name, text } = req.body;

    if (!postId || !text) {
        return res.status(400).json({
            error: "'postId' and 'text' are required."
        });
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ error: 'Invalid post ID.' });
    }

    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({
            error: `Post with id ${postId} not found.`
        });
    }

    const foundUrls = extractUrls(text);
    if (foundUrls.length > 0) {
        const validationResults = validateUrls(foundUrls);
        const unsafeUrls = validationResults.filter((entry) => !entry.safe);
        if (unsafeUrls.length > 0) {
            return res.status(400).json({
                error: `Comment contains unsafe links: ${unsafeUrls.map((entry) => entry.url).join(', ')}`,
                unsafeUrls: unsafeUrls.map((entry) => entry.url)
            });
        }
    }

    const comment = await Comment.create({ name, content: text, postId });
    res.status(201).json(comment);
});

module.exports = router;
