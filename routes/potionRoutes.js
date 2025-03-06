const express = require('express');
const router = express.Router();
const potionController = require('../controller/potionController');
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




router.get('/CreatePotion',auth,potionController.CreatePotion);

router.post('/createPotion',upload.single("file"),potionController.createPotion);

router.get('/inventory',auth,potionController.inventory);

router.post('/activatePotion/:id',auth,potionController.activatePotion);





module.exports=router
