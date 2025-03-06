const express = require('express');

const { Router } = require("express");
const leaderboardRoute=require("../controller/leaderboard");
const router = express.Router();
const auth = require('../middleware/auth');
const leaderboard = require("../models/leaderboard");



router.get("/leaderboard",auth, leaderboardRoute.leaderboard);


module.exports = router;


