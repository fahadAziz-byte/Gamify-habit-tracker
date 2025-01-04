const express = require('express');
const Requests = require('../models/friendRequest');
const Users = require('../models/usersModel');
const router = express.Router();

router.get('/friendRequests', async (req, res) => {
  const currentUser = await Users.findOne({ username: req.cookies.username });
  const requests = await Requests.find({ receiverUsername: req.cookies.username });
  const friendsList = await Users.find({ username: { $in: currentUser.friends } });
  const suggestedFriendsList = await Users.find({ username: { $nin: currentUser.friends } });
  res.render('friendRequests', { requests, friendsList, suggestedFriendsList, user: currentUser });
});

router.get('/addFriend/:username', async (req, res) => {
  const newRequest = new Requests({ senderUsername: req.cookies.username, receiverUsername: req.params.username });
  await newRequest.save();
  res.redirect('/friends/friendRequests');
});

router.get('/confirmRequests/:senderUsername', async (req, res) => {
  const sender = await Users.findOne({ username: req.params.senderUsername });
  const receiver = await Users.findOne({ username: req.cookies.username });

  sender.friends.push(receiver.username);
  receiver.friends.push(sender.username);
  await sender.save();
  await receiver.save();
  await Requests.findOneAndDelete({ senderUsername: req.params.senderUsername, receiverUsername: req.cookies.username });
  res.redirect('/friends/friendRequests');
});

router.get('/deleteRequest/:senderUsername', async (req, res) => {
  await Requests.findOneAndDelete({ senderUsername: req.params.senderUsername, receiverUsername: req.cookies.username });
  res.redirect('/friends/friendRequests');
});

module.exports = router;
