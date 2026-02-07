const express = require('express');
const path = require('path');
const { validateUrls } = require('./urlvalidator');
const app = express();
const PORT = 3000;

// Middleware: Serve static files from the "public" directory
// BEST PRACTICE: Since main.js is in 'src', we use '../public' to go up one level to root, then into public.
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Basic route for the home page (fallback)
app.get('/', (req, res) => {
    // Sends the index.html file to the user
    // Again, we navigate out of 'src' (..) and into 'public'
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});