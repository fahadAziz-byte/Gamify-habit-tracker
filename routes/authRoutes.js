const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const {validateSignup,validateLogin}=require("../validators/authValidators");

router.post('/signup',validateSignup, authController.signup);
router.post('/login',validateLogin, authController.login);
router.get('/logout', authController.logout);

module.exports = router;
