const Avatar=require('../models/avatar');





exports.editAvatar=async(req,res)=>{
    const avatar=await Avatar.findOne({_id:req.params.id});
    res.render('admin/editAvatarForm',{avatar,avatarId:req.params.id});
}




exports.deleteAvatar=async(req,res)=>{
    await Avatar.deleteOne({_id:req.params.id});
    res.redirect('/admin');
}



exports.editAvatarwithID=async(req,res)=>{
    const avatar=await Avatar.findOne({_id:req.params.id});
    let data = req.body;
    avatar.name = data.name;
    avatar.cost = data.cost;
    avatar.description = data.description;
    if (req.file) {
        avatar.imageURL = req.file.filename;
    }

      console.log("avatart edited successfully");


    await avatar.save();
    res.redirect('/admin');
}


// createAvatar  get reqyuest the render form.
exports.createAvatar=(req,res)=>{
    res.render('admin/newAvatarForm.ejs');
}


// post request for creating the newe avatar
exports.CreateAvatar=async (req, res) => {
    let data = req.body;
    let newAvatar= new Avatar(data);
    if (req.file) {
        newAvatar.imageURL = req.file.filename;
    }
    await newAvatar.save();
    res.redirect('/admin');
}


