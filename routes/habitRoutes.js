const express = require('express');
const router = express.Router();
const habitController = require('../controller/habitController');
const auth = require('../middleware/auth');


router.get('/habits',auth,habitController.habits);

router.get('/createHabit',auth,habitController.CreateHabit);

router.post('/createhabit',auth,habitController.createHabit);


router.get("/checkInHabit/:_id",auth,habitController.checkInHabit);

router.get("/removehabit",auth,habitController.removeHabit);

module.exports=router

