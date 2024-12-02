const express=require('express');
const server=express();
server.set('view engine','ejs')
server.use(express.urlencoded({extended : true}));
const Users=require('../Gamify-habit-tracker/models/usersModel');
const Requests=require('../Gamify-habit-tracker/models/friendRequest');
const Challenges=require('../Gamify-habit-tracker/models/challenges');
const mongoose = require('mongoose');
let currentUserName='';

server.get('/',(req,res)=>{
    res.render('Registration/login');
})

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
            targetGoal,
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

// GET /viewChallenges - Displays challenges accepted by the current user
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

server.post('/completeChallenge', async (req, res) => {
    try {
        const { challengeId } = req.body;
        
        await Challenges.updateOne(
            { _id: challengeId, "participants.username": currentUserName },
            { $set: { "participants.$.status": "completed" } }
        );

        res.redirect('/viewChallenges');
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to complete challenge.");
    }
});



server.listen(5000,()=>{
    console.log("Server running on port 5000")
})

let connectionString='mongodb://localhost/Users';
mongoose.connect(connectionString)
.then(console.log('Successfully connected to '+connectionString))
.catch(err=>console.log("error occured : \n"+err));