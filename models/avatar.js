const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imageURL: { type: String, required: true },
    cost: { type: Number, required: true },
    description: { type: String, required: true },
});

module.exports = mongoose.model('Avatar', avatarSchema);
