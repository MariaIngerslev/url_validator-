const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes/api');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');
const messagesRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`)
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
const PUBLIC_DIR = path.join(__dirname, '../public');

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:     ["'self'"],
            scriptSrc:      ["'self'"],
            styleSrc:       ["'self'", "'unsafe-inline'"],
            imgSrc:         ["'self'", "https:"],
            connectSrc:     ["'self'"],
            fontSrc:        ["'self'"],
            objectSrc:      ["'none'"],
            frameAncestors: ["'none'"],
            baseUri:        ["'self'"],
            formAction:     ["'self'"],
        },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Reject cross-origin mutation requests (CSRF protection for cookie-less API)
app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const origin = req.get('Origin') || req.get('Referer') || '';
        if (origin && !ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
            return res.status(403).json({ error: 'Forbidden: cross-origin mutation not allowed.' });
        }
    }
    next();
});

// Rate limiting (disabled in test environment to prevent 429s from shared limiter state)
const noopMiddleware = (req, res, next) => next();
const commentLimiter = process.env.NODE_ENV === 'test'
    ? noopMiddleware
    : rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });
const messageLimiter = process.env.NODE_ENV === 'test'
    ? noopMiddleware
    : rateLimit({ windowMs: 60_000, max: 5,  standardHeaders: true, legacyHeaders: false });

// Middleware
app.use(express.static(PUBLIC_DIR));
app.use(express.json());

// API routes
app.use('/api', apiRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentLimiter, commentsRoutes);
app.use('/api/messages', messageLimiter, messagesRoutes);

// SPA catch-all: serve index.html for any non-API route
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

module.exports = app;
