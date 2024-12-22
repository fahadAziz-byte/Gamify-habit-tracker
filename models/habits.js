const mongoose = require('mongoose');


const HabitSchema = new mongoose.Schema({
    username: String,
    title: { type: String, required: true },
    description: { type: String, default: '' },
    createdDate: { type: Date, default: Date.now },
    lastCheckIn: { type: String, default: null },
    streak: { type: Number, default: 0 },
    tags:{type: String},
    isCompletedToday: { type: Boolean, default: false },
});

const Habit = mongoose.model('Habit', HabitSchema);
const habits = [
    {
        username: 'fahadaziz_001',
        title: 'Morning Jog',
        description: 'Jog for 30 minutes every morning.',
        lastCheckIn: '2024-12-05',
        streak: 3,
        isCompletedToday: true,
    },
    {
        username: 'fahadaziz_001',
        title: 'Drink Water',
        description: 'Drink 8 glasses of water daily.',
        lastCheckIn: null,
        streak: 0,
        isCompletedToday: false,
    },
    {
        username: 'fahadaziz_001',
        title: 'Read a Book',
        description: 'Read at least 20 pages daily.',
        lastCheckIn: '2024-12-05',
        streak: 10,
        isCompletedToday: true,
    },
    {
        username: 'fahadaziz_001',
        title: 'Meditation',
        description: 'Meditate for 15 minutes.',
        lastCheckIn: null,
        streak: 0,
        isCompletedToday: false,
    },
    {
        username: 'fahadaziz_001',
        title: 'No Junk Food',
        description: 'Avoid eating any junk food today.',
        lastCheckIn: null,
        streak: 0,
        isCompletedToday: false,
    },
];

// Function to Insert Sample Data
async function insertSampleHabits() {
    try {
        // Insert sample habits into the database
        await Habit.insertMany(habits);
        console.log('Sample habits inserted successfully!');
    } catch (error) {
        console.error('Error inserting sample habits:', error.message);
    }
}

// Export the Model and the Data Insertion Function
module.exports = Habit;
