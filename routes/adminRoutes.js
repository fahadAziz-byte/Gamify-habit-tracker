const express = require('express');
const Avatar = require('../models/avatar');
const Potion = require('../models/Potion');
const auth = require('../middleware/auth');
const multer = require('multer');
const router = express.Router();

const upload = multer({ dest: './uploads' });

router.get('/', auth, async (req, res) => {
  const avatars = await Avatar.find();
  const potions = await Potion.find();
  res.render('admin/admin', { avatars, potions });
});

router.get('/create-avatar', auth, (req, res) => res.render('admin/newAvatarForm'));

router.post('/create-avatar', upload.single('file'), async (req, res) => {
  const avatar = new Avatar({ ...req.body, imageURL: req.file.filename });
  await avatar.save();
  res.redirect('/admin');
});

router.get('/edit-avatar/:id', auth, async (req, res) => {
  const avatar = await Avatar.findById(req.params.id);
  res.render('admin/editAvatarForm', { avatar });
});

router.post('/edit-avatar/:id', auth, async (req, res) => {
  await Avatar.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/admin');
});

router.get('/delete-avatar/:id', auth, async (req, res) => {
  await Avatar.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});

module.exports = router;
