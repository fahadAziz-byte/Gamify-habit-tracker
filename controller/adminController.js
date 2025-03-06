
const Users=require('../models/usersModel');

const Potion=require('../models/Potion');

const Avatar=require('../models/avatar');



exports.Admin=async(req,res)=>{
    const avatar=await Avatar.find();
    const potion=await Potion.find();
    const user=await Users.findOne({username: req.cookies.username});
    res.render('admin/admin.ejs',{avatar,potion,userAvatarId:user.avatar.avatarId})
}



exports.progress=(req,res)=>{
    console.log(req.cookies.username);
    res.render('progressBar');
}