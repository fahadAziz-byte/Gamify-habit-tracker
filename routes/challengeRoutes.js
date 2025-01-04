const express = require('express');
const Challenges = require('../models/challenges');
const Users = require('../models/usersModel');
const Leaderboard = require('../models/leaderboard');
const { calculatePoints } = require('../public/javascript/calculatePoints');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  const user = await Users.findOne({ username: req.cookies.username });
  res.render('Challenges', { user });
});

router.get('/create', auth, async (req, res) => {
  const user = await Users.findOne({ username: req.cookies.username });
  const participants = await Users.find({ username: { $in: user.friends } });
  res.render('createChallenge', { participants });
});

router.post('/create', auth, async (req, res) => {
  const { title, description, startDate, endDate, difficulty, category, points, participants } = req.body;
  const formattedParticipants = (Array.isArray(participants) ? participants : [participants]).map(participant => ({
    username: participant,
    status: 'pending',
  }));

  const challenge = new Challenges({
    title,
    description,
    startDate,
    endDate,
    difficulty,
    category,
    points,
    participants: formattedParticipants,
    creator: req.cookies.username,
  });

  await challenge.save();
  res.redirect('/challenges');
});

router.get('/requests', auth, async (req, res) => {
  const challenges = await Challenges.find({
    participants: { $elemMatch: { username: req.cookies.username, status: 'pending' } },
  });
  res.render('challengeRequests', { challenges });
});

router.post('/accept/:id', auth, async (req, res) => {
  await Challenges.updateOne(
    { _id: req.params.id, 'participants.username': req.cookies.username },
    { $set: { 'participants.$.status': 'accepted' } }
  );
  res.redirect('/challenges/requests');
});

router.post('/decline/:id', auth, async (req, res) => {
  await Challenges.updateOne(
    { _id: req.params.id, 'participants.username': req.cookies.username },
    { $set: { 'participants.$.status': 'declined' } }
  );
  res.redirect('/challenges/requests');
});

router.post('/complete', auth, async (req, res) => {
  const challengeId = req.body.challengeId;
  const basePoints = Number(req.body.points);

  await Challenges.updateOne(
    { _id: challengeId, 'participants.username': req.cookies.username },
    { $set: { 'participants.$.status': 'completed' } }
  );

  const user = await Users.findOne({ username: req.cookies.username });
  const bonusPoints = calculatePoints(basePoints, user);

  const leaderboard = await Leaderboard.findOneAndUpdate(
    { username: user.username },
    { $inc: { points: bonusPoints } },
    { upsert: true, new: true }
  );

  if (leaderboard.points >= leaderboard.level * 100) {
    await Leaderboard.updateOne({ username: user.username }, { $inc: { level: 1 } });
  }

  res.redirect('/challenges');
});

router.get('/view', auth, async (req, res) => {
  const challenges = await Challenges.find({ 'participants.username': req.cookies.username });
  res.render('viewChallenges', { challenges });
});

module.exports = router;
