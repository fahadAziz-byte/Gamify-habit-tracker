const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const auth = require('../middleware/auth');







router.get('/admin',auth,adminController.Admin);

router.get('/admin',auth,adminController.progress);


module.exports=router
