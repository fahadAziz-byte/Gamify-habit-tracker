const express = require('express');
const router = express.Router();
const friendController = require('../controller/friendController');
const auth = require('../middleware/auth');

router.get('/friendRequests',auth,friendController.friendRequests);

router.get('/addFriend/:username/:currusername', auth, friendController.addFriend);

router.get('/confirmRequests/:senderUsername/:receiverUsername', auth, friendController.confirmRequest);

router.get('/deleteRequest/:senderUsername/:receiverUsername', auth, friendController.deleteRequest);

module.exports = router;
