const mongoose = require("mongoose");

const dailyStreaksSchema = new mongoose.Schema({
    lastUpdateDate: {
        type: Date,
        required: true,
    },
});

const DailyStreaks = mongoose.model("DailyStreaks", dailyStreaksSchema);

module.exports = DailyStreaks;
