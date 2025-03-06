
const Requests=require('../models/friendRequest');
const Users=require("../models/usersModel");
const path = require('path'); 

const Challenges=require('../models/challenges');

const Leaderboard=require('../models/leaderboard');

const Potion=require('../models/Potion');

const { calculatePoints } = require(path.join(__dirname, '../public/javascript/calculatePoints'));










// const calculatePoints=function (basePoints, user) {
//     let finalPoints = basePoints;

//   if(!user|| !user.inventory){
   
//     console.error(" user or inventory is null ");
//     return finalPoints;
   


//   }



    
//     user.inventory.forEach((potion) => {
//         if (potion.activatedAt) {
//             const activationDate = new Date(potion.activatedAt);
//             const expiryDate = new Date(activationDate);
//             expiryDate.setDate(activationDate.getDate() + potion.duration);

//             if (new Date() <= expiryDate) {
//                 if (potion.effectType === 'habitMultiplier') {
//                     finalPoints *= 2; 
//                 } else if (potion.effectType === 'challengeMultiplier') {
//                     finalPoints *= 1.5; 
//                 }
//             }
//         }
//     });

//     return finalPoints;
// }





let currentUserName='';


// get request for the creating the challeg
exports.createChallenge=async(req,res)=>{
    const currentUser=await Users.findOne({username:req.cookies.username});
    const participants=await Users.find({username : {$in : currentUser.friends}});
    res.render('createChallenge',{participants});
}


// post request for creating the challeneg 

exports.createChallenges=async (req, res) => {
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

        let creator=req.cookies.username;

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
}

// exporting the Challenges that user has accepted of the user  
exports.Challenges=async(req,res)=>{
    const user=await Users.findOne({username:req.cookies.username});
    res.render('Challenges',{user});
}

// exports the challenge Reqesut 
exports.challengeRequest=async (req, res) => {
    const currentUser = await Users.findOne({ username: req.cookies.username });
    const challenges = await Challenges.find({
        participants: { $elemMatch: { username: currentUser.username, status: "pending" }
    }});

    res.render('challengeRequests', { challenges });
}




// exports the acceptChallenge  for sepcific user
exports.acceptChallenge=async (req, res) => {
    const challengeId = req.params.id;await Challenges.updateOne(
        { _id: challengeId, "participants.username": req.cookies.username },
        { $set: { "participants.$.status": "accepted" } }
    );

    res.redirect('/challengeRequests');
}




// declinechallenge 
exports.declineChallenge=async (req, res) => {
    const challengeId = req.params.id;
    await Challenges.updateOne(
        { _id: challengeId, "participants.username": req.cookies.username },
        { $set: { "participants.$.status": "declined" } }
    );

    res.redirect('/challengeRequests');
}



// veiw Challenges 
exports.viewChallenges= async (req, res) => {
    try {

        const challenges = await Challenges.find({
            "participants.username": req.cookies.username,
        });

        res.render('viewChallenges', { challenges, currentUserName:req.cookies.username });
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to fetch challenges.");
    }
}



// completeChallenge

exports.completeChallenge= async (req, res) => {
    try {
        const challengeId= req.body.challengeId;
        const basePoints = Number(req.body.points);
        console.log('Challenge bonus points : '+basePoints);
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
}








