const express = require('express');
const Avatar = require('../models/avatar');
const Potion = require('../models/Potion');
const Users = require('../models/usersModel');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  const user = await Users.findOne({ username: req.cookies.username });
  const avatars = await Avatar.find();
  const potions = await Potion.find();

  const purchasedPotions = user.inventory.map(item => item.potionId.toString());
  const availablePotions = potions.filter(potion => !purchasedPotions.includes(potion._id.toString()));

  res.render('shop', { user, avatars, potions: availablePotions });
});

router.post('/buy-avatar/:id', auth, async (req, res) => {
  const user = await Users.findOne({ username: req.cookies.username });
  const avatar = await Avatar.findById(req.params.id);

  if (user.coins < avatar.cost) return res.status(400).send('Not enough coins');

  user.coins -= avatar.cost;
  user.avatar = { avatarId: avatar._id, imageURL: avatar.imageURL };
  await user.save();
  res.redirect('/shop');
});

router.post('/buy-potion/:id', auth, async (req, res) => {
  const user = await Users.findOne({ username: req.cookies.username });
  const potion = await Potion.findById(req.params.id);

  if (!potion || user.coins < potion.cost) return res.status(400).send('Invalid purchase');

  user.coins -= potion.cost;
  user.inventory.push({
    potionId: potion._id,
    effectType: potion.effectType,
    duration: potion.duration,
    activatedAt: null,
    expirationDate: null,
    imageURL: potion.imageURL,
    description: potion.description,
  });

  await user.save();
  res.redirect('/shop');
});

module.exports = router;
