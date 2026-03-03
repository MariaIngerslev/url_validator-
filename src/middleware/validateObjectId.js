const mongoose = require('mongoose');

// Validates that req.params[paramName] is a valid MongoDB ObjectId.
const validateObjectId = (paramName) => (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
        return res.status(400).json({ error: `Invalid ${paramName}.` });
    }
    next();
};

module.exports = validateObjectId;
