const express = require('express');
const { validateUrls } = require('../urlvalidator');
const store = require('../data/store');

const router = express.Router();

// Extract URLs from text
function extractUrls(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.match(urlPattern) || [];
}

// GET /api/comments/:postId - Return comments for a specific post
router.get('/:postId', (req, res) => {
    const postId = parseInt(req.params.postId, 10);
    const postComments = store.getCommentsByPostId(postId);
    res.json(postComments);
});

// POST /api/comments - Add a comment
router.post('/', (req, res) => {
    const { postId, author, text } = req.body;

    if (!postId || !author || !text) {
        return res.status(400).json({
            error: "'postId', 'author', and 'text' are required."
        });
    }

    const parsedPostId = parseInt(postId, 10);

    // Validate that the post exists
    if (!store.getPostById(parsedPostId)) {
        return res.status(404).json({
            error: `Post with id ${parsedPostId} not found.`
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

    const comment = store.addComment({ postId: parsedPostId, author, text });
    res.status(201).json(comment);
});

module.exports = router;
