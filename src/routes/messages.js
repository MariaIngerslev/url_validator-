const express = require('express');
const Message = require('../models/Message');

const router = express.Router();

router.post('/', async (req, res) => {
    const { firstName, lastName, email, message } = req.body;

    if (
        typeof firstName !== 'string' || firstName.trim() === '' ||
        typeof lastName  !== 'string' || lastName.trim()  === '' ||
        typeof email     !== 'string' || email.trim()     === '' ||
        typeof message   !== 'string' || message.trim()   === ''
    ) {
        return res.status(400).json({
            error: "'firstName', 'lastName', 'email', and 'message' are required non-empty strings."
        });
    }

    const savedMessage = await Message.create({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim(),
        message:   message.trim()
    });

    res.status(201).json(savedMessage);
});

module.exports = router;
