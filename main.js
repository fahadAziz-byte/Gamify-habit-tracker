const express=require('express');
const server=express();
server.set('view engine','ejs')
server.use(express.urlencoded({extended : true}));
const Users=require('../Gamify-habit-tracker/models/usersModel');
const Requests=require('../Gamify-habit-tracker/models/friendRequest');
const Challenges=require('../Gamify-habit-tracker/models/challenges');
const Habit= require('../Gamify-habit-tracker/models/habits');
const DailyStreaks = require('../Gamify-habit-tracker/models/dailyStreaks');
const Leaderboard=require('../Gamify-habit-tracker/models/leaderboard');
const { calculateCoinsForStreak } = require('./public/javascript/calculateCoins');
const { calculatePoints } = require('./public/javascript/calculatePoints');
const mongoose = require('mongoose');
server.use(express.static('public'));
let currentUserName='';

async function performDailyUpdates() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        await Habit.updateMany(
            { isCompletedToday: true },
            {
                $set: {
                    isCompletedToday: false,
                },
            }
        );

        await Habit.updateMany(
            { lastCheckIn: { $lt: yesterday.toISOString() } },
            {
                $set: {
                    streak: 0,
                },
            }
        );

        console.log("Daily updates performed successfully.");
    } catch (error) {
        console.error("Error performing daily updates:", error);
    }
}


async function checkAndPerformDailyUpdates() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let streakData = await DailyStreaks.findOne();

        if (!streakData) {
            streakData = new DailyStreaks({ lastUpdateDate: new Date(0) });
            await streakData.save();
        }

        const lastUpdateDate = new Date(streakData.lastUpdateDate);

        if (lastUpdateDate.getTime() !== today.getTime()) {
            await performDailyUpdates();

            streakData.lastUpdateDate = today;
            await streakData.save();
        }
        else{
            console.log('Already performed updates today')
        }
    } catch (error) {
        console.error("Error during daily updates check:", error);
    }
}

checkAndPerformDailyUpdates();

server.get('/',(req,res)=>{
    res.render('Registration/login');
})

server.get('/shop', (req, res) => {
    const shopItems = [
        { name: "Potion of Streak Recovery", description: "Restores 3 streaks", price: 20, image: "/images/potion.png" },
        { name: "Knight Helmet", description: "Customize your avatar", price: 50, image: "/images/knight-helmet.png" }
    ];
    res.render('shop', { shopItems });
});


server.get('/home',(req,res)=>{
    res.render('Homepage');
})

server.post('/signup',async(req,res)=>{
    let data=req.body;
    let newUser=Users(data);
    try {
        const doesUserExistAlready = await Users.findOne({ username: newUser.username });

        if (doesUserExistAlready) {
            return res.render('Registration/Login', { error: 'User already exists' });
        }
        await newUser.save();
        currentUserName=newUser.username;
        return res.render('Homepage');
    } catch (error) {
        console.error("Error occurred:", error);
        return res.status(500).send('An unexpected error occurred.');
    }
})

server.post('/login',async(req,res)=>{
    let data = req.body;
    let isUserValid=new Users(data);
    if(await Users.findOne({username : isUserValid.username , password : isUserValid.password})){
        currentUserName=isUserValid.username;
        return res.render('Homepage');
    }
    return res.render('Registration/Login', { error: 'No Such User exists' });
})

server.get('/logout',(req,res)=>{
    currentUserName='';
    res.redirect('/');
})

server.get('/friendRequests',async(req,res)=>{
    const sentRequests=await Requests.find({senderUsername : currentUserName});
    const requests=await Requests.find({receiverUsername : currentUserName});
    const currentUser=await Users.findOne({username:currentUserName});
    try{
        const friendsList=await Users.find({username : {$in : currentUser.friends}});
        const suggestedFriendsList=await Users.find({username : {$nin : currentUser.friends }});
        res.render('friendRequests.ejs',{friendsList,suggestedFriendsList,currentUser,requests,sentRequests});
    }catch(err){
        const suggestedFriendsList=await Users.find();
        res.render('friendRequests.ejs',{suggestedFriendsList,currentUser,requests,sentRequests});
    }
    
})

server.get('/addFriend/:username/:currusername',async(req,res)=>{
    const receiverUsername = req.params['username'];
    const senderUsername = req.params['currusername'];
    const newRequest=new Requests({
        senderUsername,
        receiverUsername
    })
    await newRequest.save();
    res.redirect('/friendRequests');
})

server.get('/confirmRequests/:senderUsername/:receiverUsername',async(req,res)=>{
    const receiver = await Users.findOne({ username: req.params['receiverUsername'] });
    const sender = await Users.findOne({ username: req.params['senderUsername'] });
    receiver.friends.push(req.params['senderUsername']);
    sender.friends.push(req.params['receiverUsername']);
    await receiver.save();
    await sender.save();
    await Requests.findOneAndDelete({
        receiverUsername : req.params['receiverUsername'],
        senderUsername : req.params['senderUsername']
    });
    res.redirect('/friendRequests');
})

server.get('/deleteRequest/:senderUsername/:receiverUsername',async(req,res)=>{
    await Requests.findOneAndDelete({
        receiverUsername : req.params['receiverUsername'],
        senderUsername : req.params['senderUsername']
    });
    res.redirect('/friendRequests');
})

server.get('/progress',(req,res)=>{
    console.log(currentUserName);
    res.render('progressBar');
})

server.get('/getStarted',(req,res)=>{
    res.render('getStarted');
})

server.get('/createChallenge',async(req,res)=>{
    const currentUser=await Users.findOne({username:currentUserName});
    const participants=await Users.find({username : {$in : currentUser.friends}});
    res.render('createChallenge',{participants});
})

server.post('/createChallenge', async (req, res) => {
    try {
        const { title, description, startDate, endDate, difficulty, category, targetGoal, points, participants} = req.body;

        // Transform participants into objects with `username` and `status`
        const normalizedParticipants = Array.isArray(participants)
            ? participants
            : [participants];

        // Transform participants into objects with `username` and `status`
        const formattedParticipants = normalizedParticipants.map(participant => ({
            username: participant,
            status: "pending", 
        }));

        let creator=currentUserName;

        // Create a new challenge
        const newChallenge = new Challenges({
            title,
            description,
            startDate,
            endDate,
            difficulty,
            category,
            points,
            participants: formattedParticipants,
            creator
        });

        await newChallenge.save();
        res.render('getStarted');
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to create challenge");
    }
});

server.get('/Challenges',(req,res)=>{
    res.render('Challenges');
})


server.get('/challengeRequests', async (req, res) => {
    const currentUser = await Users.findOne({ username: currentUserName });
    const challenges = await Challenges.find({
        participants: { $elemMatch: { username: currentUser.username, status: "pending" }
    }});

    res.render('challengeRequests', { challenges });
});

server.post('/acceptChallenge/:id', async (req, res) => {
    const challengeId = req.params.id;await Challenges.updateOne(
        { _id: challengeId, "participants.username": currentUserName },
        { $set: { "participants.$.status": "accepted" } }
    );

    res.redirect('/challengeRequests');
});

server.post('/declineChallenge/:id', async (req, res) => {
    const challengeId = req.params.id;
    await Challenges.updateOne(
        { _id: challengeId, "participants.username": currentUserName },
        { $set: { "participants.$.status": "declined" } }
    );

    res.redirect('/challengeRequests');
});

server.get('/viewChallenges', async (req, res) => {
    try {

        const challenges = await Challenges.find({
            "participants.username": currentUserName,
        });

        res.render('viewChallenges', { challenges, currentUserName });
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to fetch challenges.");
    }
});

server.post("/completeChallenge", async (req, res) => {
    try {
        const challengeId= req.body.challengeId;
        const basePoints = Number(req.body.points);
        console.log('Challenge bonus points : '+bonusPoints);
        await Challenges.updateOne(
            { _id: challengeId, "participants.username": currentUserName },
            { $set: { "participants.$.status": "completed" } }
        );

        
        const requsername = currentUserName;
        const user=await Users.findOne({username:currentUserName})
        currentUserName.coins += (basePoints)/4;
        const bonusPoints=calculatePoints(basePoints,user);
        const leaderboardResult=await Leaderboard.findOneAndUpdate(
            { username: requsername },
            { $inc: { points: bonusPoints } },
            { upsert: true, new: true }
        );

        if (leaderboardResult.points >= leaderboardResult.level *100){
            await Leaderboard.updateOne({username:currentUserName},{ $inc:{level: 1}});
        }

        console.log("Challenge completed! Bonus points added.");
        res.redirect('/viewChallenges')
    } catch (error) {
        console.error("Error updating leaderboard for challenge:", error);
        res.status(500).send("An error occurred while completing the challenge.");
    }
});


server.get("/leaderboard", async (req, res) => {
    try {
        const leaderboard = await Leaderboard.find().sort({ points: -1 }).limit(10);
        res.render("leaderboard", { leaderboard });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.status(500).send("Error loading leaderboard.");
    }
});


server.get('/habits', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    console.log(today);
    const habits = await Habit.find({ username : currentUserName});

    const dueHabits = habits.filter(habit => habit.isCompletedToday!=true );
    const completedHabits = habits.filter(habit => habit.isCompletedToday ==true);

    res.render('habits/habits', { dueHabits, completedHabits });
});

server.get("/createHabit",(req,res)=>{
    res.render("habits/createHabit");
})

server.post("/createHabit",async(req,res)=>{
    if(req.body.username===currentUserName){
        let data=req.body;
        let newHabit=new Habit(data);
        await newHabit.save();
        res.redirect('/habits');
    }else{
        res.send('You cannot add habits for other user');
    }
});

server.post("/checkInHabit", async (req, res) => {
    try {
        
        const habitResult = await Habit.updateOne(
            { _id: req.body._id, isCompletedToday: false },
            {
                $set: {
                    isCompletedToday: true,
                    lastCheckIn: new Date().toISOString(),
                },
                $inc: { streak: 1 },
            }
        );

        const user=await Users.findOne({username:currentUserName});
        const basePoints = 5;
        const pointsToAdd=calculatePoints(basePoints,user);
        const leaderboardResult = await Leaderboard.findOneAndUpdate(
            { username: currentUserName },
            { $inc: { points: pointsToAdd } },
            { upsert: true, new: true } 
        );
        if (leaderboardResult.points >= leaderboardResult.level *100){
            await Leaderboard.updateOne({username:currentUserName},{ $inc:{level: 1}});
        }

        let habit= await Habit.findById(req.params._id);
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
});


server.get('/removeHabit/:_id',async(req,res)=>{
    await Habit.deleteOne({ _id: req.params._id});
    res.redirect('/habits');
})





server.listen(5000,()=>{
    console.log("Server running on port 5000")
})

let connectionString='mongodb://localhost/Users';
mongoose.connect(connectionString)
.then(console.log('Successfully connected to '+connectionString))
.catch(err=>console.log("error occured : \n"+err));