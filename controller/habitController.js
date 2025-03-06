
const Users=require("../models/usersModel");

const path = require('path'); 


const Leaderboard=require('../models/leaderboard');


const Habit= require('../models/habits');

const { calculateCoinsForStreak } = require(path.join(__dirname, '../public/javascript/calculateCoins'));
const { calculatePoints } = require(path.join(__dirname, '../public/javascript/calculatePoints'));





exports.habits=async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    console.log(today);
    const user=await Users.findOne({username:req.cookies.username});
    const habits = await Habit.find({ username : req.cookies.username});

    const dueHabits = habits.filter(habit => habit.isCompletedToday!=true );
    const completedHabits = habits.filter(habit => habit.isCompletedToday ==true);

    res.render('habits/habits', {habits, dueHabits, completedHabits,user });
}









// habits 
exports.CreateHabit=(req,res)=>{
    res.render("habits/createHabit");
}



exports.createHabit=async(req,res)=>{
        let data=req.body;
        data.username=req.cookies.username;
        let newHabit=new Habit(data);
        await newHabit.save();
        res.redirect('/habits');
}




exports.checkInHabit= async (req, res) => {
    try {
        
        const habitResult = await Habit.updateOne(
            { _id: req.params._id, isCompletedToday: false },
            {
                $set: {
                    isCompletedToday: true,
                    lastCheckIn: new Date().toISOString(),
                },
                $inc: { streak: 1 },
            }
        );

        const user=await Users.findOne({username:req.cookies.username});
        const basePoints = 5;
        const pointsToAdd=calculatePoints(basePoints,user);
        const leaderboardResult = await Leaderboard.findOneAndUpdate(
            { username: currentUserName },
            { $inc: { points: pointsToAdd } },
            { upsert: true, new: true } 
        );
        if (leaderboardResult.points >= leaderboardResult.level *100){
            await Leaderboard.updateOne({username:req.cookies.username},{ $inc:{level: 1}});
        }

        let habit= await Habit.findOne({_id:req.params._id});
        const coins = calculateCoinsForStreak(habit.streak);
        if (coins > 0) {
            const user = await Users.findOne({username:habit.username});
            user.coins += coins;
            await user.save();
        }

        res.redirect('/habits');
    } catch (error) {
        console.error("Error updating habit and leaderboard:", error);
        res.status(500).send("An error occurred while checking in the habit.");
    }
}




exports.removeHabit=async(req,res)=>{
    await Habit.deleteOne({ _id: req.params._id});
    res.redirect('/habits');
}

