const mongoose = require('mongoose');

const potionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    effectType: { type: String, required: true, enum: ['habitMultiplier', 'challengeMultiplier'] },
    duration: { type: Number, required: true }, // Duration is in days
    cost: { type: Number, required: true },
    description: { type: String },
});

module.exports = mongoose.model('Potion', potionSchema);
