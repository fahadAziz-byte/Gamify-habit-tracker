const Users=require('../models/usersModel');
const Potion=require('../models/Potion');
const Avatar=require('../models/avatar');


exports.buyAvatar=async (req, res) => {
    try {
        const avatar = await Avatar.findOne({_id:req.params.id});
        console.log(avatar);
        const user = await Users.findOne({username:req.cookies.username}); // Assuming req.user contains authenticated user details

        if (user.coins < avatar.cost) {
            return res.status(400).send('Not enough coins to purchase this avatar.');
        }

        // Deduct coins and update the user's avatar
        user.coins -= avatar.cost;
        user.avatar.avatarId = req.params.id;
        user.avatar.imageURL = avatar.imageURL;

        await user.save();
        res.redirect('/shop'); // Redirect back to shop after purchase
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
}





exports.buyPotion =async (req, res) => {

    try {
        const user = await Users.findOne({username: req.cookies.username}); // Assuming req.user contains authenticated user data
        const potion = await Potion.findOne({_id:req.params.potionId});

        if (!potion) return res.status(404).json({ message: 'Potion not found' });

        // Check if user has enough coins
        if (user.coins < potion.cost) {
            return res.status(400).json({ message: 'Not enough coins to buy this potion' });
        }

        // Deduct coins
        user.coins -= potion.cost;

        // Add potion to user's inventory
        if (!user.inventory)
            user.inventory = [];

        user.inventory.push({
            potionId: potion._id,
            effectType: potion.effectType,
            duration: potion.duration,
            activatedAt: null, // Set to null initially
            expirationDate: null, // Set to null initially
            imageURL: potion.imageURL,
            description: potion.description,
            cost: potion.cost,
        });

        await user.save();

        res.redirect("/shop");
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
}






exports.shop=async (req, res) => {
    let avatars = await Avatar.find();
    const user = await Users.findOne({ username: req.cookies.username });
    let userAvatar = null;

    const allPotions = await Potion.find();

        // Extract potion IDs from the user's inventory
    const purchasedPotionIds = user.inventory.map(item => item.potionId.toString());

        // Categorize potions
    const purchasedPotions = allPotions.filter(potion => purchasedPotionIds.includes(potion._id.toString()));
    const notPurchasedPotions = allPotions.filter(potion => !purchasedPotionIds.includes(potion._id.toString()));


    if (user.avatar.avatarId) {
        userAvatar = await Avatar.findOne({ _id: user.avatar.avatarId });
    }

    res.render('shop', { purchasedPotions,notPurchasedPotions, avatars, user, userAvatar });
}



