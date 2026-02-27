// rewards.js
function calculateCoinsForStreak(streak) {
    if (streak === 10) {
        return 35; // Reward for 10-day streak
    } else if (streak === 15) {
        return 15; // Reward for 15-day streak
    } else if (streak === 20) {
        return 10; // Reward for 20-day streak
    } else if (streak >= 25) {
        return 5; // Reward for streaks above 25 days
    }
    return 0; // No reward for streaks less than 10 days
}

export default calculateCoinsForStreak;
