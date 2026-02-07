require('dotenv/config');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const { validateUrls } = require('./urlvalidator');

const app = express();
const PORT = 3000;

// --- Mongoose Schema & Model ---
const commentSchema = new mongoose.Schema({
    author: String,
    text: String,
    email: String,
    subscribe: Boolean,
    date: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', commentSchema);

// --- Middleware ---
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Basic route for the home page (fallback)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// API endpoint for URL validation
app.post('/api/validate-urls', (req, res) => {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
            error: "Request body must include a non-empty 'urls' array."
        });
    }

    const results = validateUrls(urls);
    const allSafe = results.every((r) => r.safe);

    res.json({ allSafe, results });
});

// Helper: extract URLs from text
function extractUrls(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.match(urlPattern) || [];
}

// API endpoint for posting comments
app.post('/api/comments', async (req, res) => {
    const { author, text, email, subscribe } = req.body;

    if (!author || !text) {
        return res.status(400).json({ error: 'Navn og kommentar er påkrævet.' });
    }

    // Check URLs in the comment text
    const foundUrls = extractUrls(text);
    if (foundUrls.length > 0) {
        const results = validateUrls(foundUrls);
        const allSafe = results.every((r) => r.safe);
        if (!allSafe) {
            const unsafeUrls = results.filter((r) => !r.safe).map((r) => r.url);
            return res.status(400).json({
                error: `Kommentaren indeholder usikre links: ${unsafeUrls.join(', ')}`,
                unsafeUrls
            });
        }
    }

    try {
        const commentData = { author, text };

        if (subscribe && email) {
            commentData.email = email;
            commentData.subscribe = true;
            console.log("📧 SENDING MAIL TO: " + email);
        }

        const comment = new Comment(commentData);
        const saved = await comment.save();

        res.status(201).json(saved);
    } catch (err) {
        console.error('Error saving comment:', err);
        res.status(500).json({ error: 'Kunne ikke gemme kommentaren.' });
    }
});

// API endpoint for fetching comments
app.get('/api/comments', async (req, res) => {
    try {
        const comments = await Comment.find().sort({ date: -1 });
        res.json(comments);
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ error: 'Kunne ikke hente kommentarer.' });
    }
});

// --- Connect to MongoDB, then start the server ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Failed to connect to MongoDB:', err.message);
        process.exit(1);
    });
