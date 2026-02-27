import mongoose from 'mongoose';

const LeaderboardSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
});

export default mongoose.model('Leaderboard', LeaderboardSchema);
