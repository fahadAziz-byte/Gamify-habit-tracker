const express = require('express');
const Leaderboard = require('../models/leaderboard');
const Users = require('../models/usersModel');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  const leaderboard = await Leaderboard.find().sort({ points: -1 }).limit(10);
  const user = await Users.findOne({ username: req.cookies.username });
  res.render('leaderboard', { leaderboard, user });
});

module.exports = router;
