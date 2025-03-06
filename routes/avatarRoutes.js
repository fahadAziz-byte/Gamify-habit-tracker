const express = require('express');
const router = express.Router();
const avatarController = require('../controller/avatarController');
const auth = require('../middleware/auth');





let multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, `${file.originalname}`);
  },
});
const upload = multer({ storage: storage });





router.get('/editAvatar/:id',auth,avatarController.editAvatar);

router.get('/createAvatar',avatarController.createAvatar);

router.post('/createAvatar',upload.single("file"),avatarController.CreateAvatar);

router.post('/editAvatar/:id',upload.single("file"),avatarController.editAvatarwithID);

router.get('/deleteAvatar/:id',auth,avatarController.deleteAvatar);















module.exports=router