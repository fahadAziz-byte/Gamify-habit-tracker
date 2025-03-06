
const Users=require("../models/usersModel");

const Challenges=require('../models/challenges');

const Leaderboard=require('../models/leaderboard');




exports.leaderboard=async (req, res) => {

  console.log("request succesfulll");


    try {
        const leaderboard = await Leaderboard.find().sort({ points: -1 }).limit(10);
        const user=await Users.findOne({username:req.cookies.username})
        res.render("leaderboard", { leaderboard,user });
        
    
        
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.status(500).send("Error loading leaderboard.");
    }
}