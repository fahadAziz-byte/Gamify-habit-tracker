const express = require('express');
const router = express.Router();
const shopController= require('../controller/shopController');
const auth = require('../middleware/auth');





router.get('/shop',auth,shopController.shop);

router.post('/shop/buy-potion/:potionId',auth,shopController.buyPotion);

router.post('/shop/buy-avatar/:id',auth,shopController.buyAvatar);








module.exports=router

