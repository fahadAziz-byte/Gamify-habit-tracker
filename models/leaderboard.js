const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
});

module.exports = mongoose.model('Leaderboard', LeaderboardSchema);
