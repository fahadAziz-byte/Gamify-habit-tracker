import mongoose from "mongoose";

const dailyStreaksSchema = new mongoose.Schema({
    lastUpdateDate: {
        type: Date,
        required: true,
    },
});

const DailyStreaks = mongoose.model("DailyStreaks", dailyStreaksSchema);

export default DailyStreaks;
