const express = require('express');
const nodemailer = require('nodemailer');
const Message = require('../models/Message');

const router = express.Router();

function createMailTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
}

const transporter = createMailTransporter();

router.post('/', async (req, res) => {
    const { firstName, lastName, email, message, website } = req.body;

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

    // Honeypot: bots fill in hidden fields; real users never see them.
    // Silently accept to avoid tipping off bots that they were caught.
    if (typeof website === 'string' && website.trim() !== '') {
        return res.status(201).json({ id: 'ok' });
    }

    const savedMessage = await Message.create({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim(),
        message:   message.trim()
    });

    if (transporter) {
        const recipientEmail = process.env.EMAIL_TO || process.env.EMAIL_USER;
        const mailOptions = {
            from:    process.env.EMAIL_USER,
            to:      recipientEmail,
            replyTo: email.trim(),
            subject: `Ny besked fra ${firstName.trim()} ${lastName.trim()} – Portfolio`,
            text: [
                `Du har modtaget en ny besked fra din portfolio-kontaktformular.`,
                ``,
                `Navn:  ${firstName.trim()} ${lastName.trim()}`,
                `Email: ${email.trim()}`,
                ``,
                `Besked:`,
                message.trim(),
            ].join('\n'),
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (emailErr) {
            // Message is already saved — log the error but don't fail the request.
            console.error('Email sending failed:', emailErr.message);
        }
    }

    res.status(201).json(savedMessage);
});

module.exports = router;
