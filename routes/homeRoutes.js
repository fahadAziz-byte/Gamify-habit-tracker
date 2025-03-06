const express = require('express');
const router = express.Router();
const homeController = require('../controller/homeController');
const auth = require('../middleware/auth');

router.get('/home', auth, homeController.getHomePage);

module.exports = router;
