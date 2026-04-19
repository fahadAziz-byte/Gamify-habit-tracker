import mongoose from 'mongoose';


const HabitSchema = new mongoose.Schema({
    username: String,
    title: { type: String, required: true },
    description: { type: String, default: '' },
    createdDate: { type: Date, default: Date.now },
    lastCheckIn: { type: String, default: null },
    streak: { type: Number, default: 0 },
    tags: { type: String },
    isCompletedToday: { type: Boolean, default: false },
});

const Habit = mongoose.model('Habit', HabitSchema);

// Export the Model and the Data Insertion Function
export default Habit;
