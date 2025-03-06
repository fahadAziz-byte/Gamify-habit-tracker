const Users = require('../models/usersModel');

exports.getHomePage = async (req, res) => {
    try {
        const user = await Users.findOne({ username: req.cookies.username });
        if (!user) return res.status(404).send('User not found');
        res.render('Homepage', { user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};
