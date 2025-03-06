const Potion=require('../models/Potion');

const Users=require('../models/usersModel');

const Avatar=require('../models/avatar');




// get request  to render the potion form 
exports.CreatePotion=async(req,res)=>{
    res.render('admin/newPotionForm.ejs');
}


// create potion post request 

exports.createPotion=async (req, res) => {
    let data = {
        name: req.body.name,
        effectType: req.body.effectType,
        duration: Number(req.body.duration), 
        cost: Number(req.body.cost), 
        description: req.body.description,
        imageURL: req.file ? req.file.filename : req.body.imageURL 
    };
    let newPotion= new Potion(data);
    await newPotion.save();
    res.redirect('/admin');
}


// inventory 

exports.inventory=async (req, res) => {
    const user = await Users.findOne({ username: req.cookies.username });
    const currentDate = new Date();

    // Check for expired potions
    user.inventory = user.inventory.filter(item => {
        if (item.expirationDate && currentDate > item.expirationDate) {
            console.log('Potion with ID ${item.potionId} has expired.');
            return false; // Remove expired potion
        }
        return true; // Keep valid potion
    });
    let userAvatar = null;

    // Fetch user's avatar if it exists
    if (user.avatar.avatarId) {
        userAvatar = await Avatar.findOne({ _id: user.avatar.avatarId });
    }

    await user.save();
    res.render('inventory', {userAvatar,user, potions: user.inventory });
}










// acativate the potion t
exports.activatePotion=async (req, res) => {
    const user = await Users.findOne({ username: req.cookies.username });
    const potionId = req.params.id;

    const potion = user.inventory.find(item => item.potionId.toString() === potionId);
    console.log(potion);
    if (potion) {
        if (!potion.activatedAt) {
            const currentDate = new Date();
            potion.activatedAt = currentDate;
            potion.expirationDate = new Date(currentDate.getTime() + potion.duration * 24 * 60 * 60 * 1000);
            await user.save();
            console.log('Potion activated successfully!');
            res.redirect('/inventory');
        } else {
            res.send('Potion is already activated!');
        }
    } else {
        res.status(404).send('Potion not found!');
        console.log(potionId)
    }
}



