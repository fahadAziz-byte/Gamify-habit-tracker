const express = require('express');
const Users = require('../models/usersModel');
const router = express.Router();

router.get('/', (req, res) => res.render('Registration/login'));

router.post('/signup', async (req, res) => {
  const newUser = new Users(req.body);
  const existingUser = await Users.findOne({ username: newUser.username });

  if (existingUser) return res.render('Registration/login', { error: 'User already exists' });

  await newUser.save();
  res.cookie('username', newUser.username, { maxAge: 3600000, httpOnly: true, secure: true, sameSite: 'Strict' });
  res.redirect('/home');
});

router.post('/login', async (req, res) => {
  const user = await Users.findOne(req.body);
  if (!user) return res.render('Registration/login', { error: 'No such user exists' });

  res.cookie('username', user.username, { maxAge: 3600000, httpOnly: true, secure: true, sameSite: 'Strict' });
  res.redirect('/home');
});

router.get('/logout', (req, res) => {
  res.clearCookie('username');
  res.redirect('/');
});

router.get('/home', async (req, res) => {
  const user = await Users.findOne({ username: req.cookies.username });
  if (!user) return res.status(404).send('User not found');
  res.render('Homepage', { user });
});

module.exports = router;
