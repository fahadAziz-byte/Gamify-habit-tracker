const express = require('express');
const router = express.Router();
const challengeController = require('../controller/Challenge');
const auth = require('../middleware/auth');



router.get('/createChallenge',auth,challengeController.createChallenge);

router.post('/createChallenge',auth,challengeController.createChallenges);

router.get('/Challenges',auth,challengeController.Challenges);

router.get('/challengeRequests',auth, challengeController.challengeRequest);

router.post('/acceptChallenge/:id',auth, challengeController.acceptChallenge);


router.post('/declineChallenge/:id',auth,challengeController.declineChallenge);


router.get('/viewChallenges',auth,challengeController.viewChallenges); 


router.post("/completeChallenge",auth,challengeController.completeChallenge);

module.exports = router;
