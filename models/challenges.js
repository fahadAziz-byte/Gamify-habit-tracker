const mongoose = require("mongoose");

const challengeSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    duration: { 
        type: Number, 
        default: function() {
            const diffInMs = this.endDate - this.startDate;
            return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
        }
    },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    category: { type: String, required: true },
    targetGoal: { type: Number, required: true },
    points: { type: Number, required: true },
    participants: [{
        username: String,
        status: { type: String, default: "pending" }
    }],
    creator: { type: String, required: true }
});


const Challenges = mongoose.model("Challenge", challengeSchema);

module.exports = Challenges;
