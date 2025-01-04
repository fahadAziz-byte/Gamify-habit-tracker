const express = require('express');
const Habit = require('../models/habits');
const Leaderboard = require('../models/leaderboard');
const Users = require('../models/usersModel');
const { calculateCoinsForStreak } = require('../public/javascript/calculateCoins');
const { calculatePoints } = require('../public/javascript/calculatePoints');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  const user = await Users.findOne({ username: req.cookies.username });
  const habits = await Habit.find({ username: req.cookies.username });
  const dueHabits = habits.filter(habit => !habit.isCompletedToday);
  const completedHabits = habits.filter(habit => habit.isCompletedToday);

  res.render('habits/habits', { habits, dueHabits, completedHabits, user });
});

router.get('/create', auth, (req, res) => res.render('habits/createHabit'));

router.post('/create', auth, async (req, res) => {
  const habit = new Habit({ ...req.body, username: req.cookies.username });
  await habit.save();
  res.redirect('/habits');
});

router.get('/checkIn/:id', auth, async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, username: req.cookies.username });
  if (habit && !habit.isCompletedToday) {
    habit.isCompletedToday = true;
    habit.lastCheckIn = new Date().toISOString();
    habit.streak += 1;

    const user = await Users.findOne({ username: req.cookies.username });
    const points = calculatePoints(5, user);
    const coins = calculateCoinsForStreak(habit.streak);

    const leaderboard = await Leaderboard.findOneAndUpdate(
      { username: user.username },
      { $inc: { points, level: points >= 100 ? 1 : 0 } },
      { upsert: true, new: true }
    );

    if (coins > 0) {
      user.coins += coins;
      await user.save();
    }
    await habit.save();
  }
  res.redirect('/habits');
});

router.get('/remove/:id', auth, async (req, res) => {
  await Habit.deleteOne({ _id: req.params.id });
  res.redirect('/habits');
});

module.exports = router;
