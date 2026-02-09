const express = require('express');
const { validateUrls } = require('../urlvalidator');

const router = express.Router();

// POST /api/validate-urls
router.post('/validate-urls', (req, res) => {
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

module.exports = router;
