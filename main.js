const express=require('express');
const server=express();


const Users=require('../Gamify-habit-tracker/models/usersModel');

const Habit= require('../Gamify-habit-tracker/models/habits');
const DailyStreaks = require('../Gamify-habit-tracker/models/dailyStreaks');

const mongoose = require('mongoose');
let cookieParser = require("cookie-parser");
let session = require("express-session");

server.set('view engine','ejs')

server.use(express.urlencoded({extended : true}));
server.use(express.static('public'));
server.use(express.static('uploads'));
server.use(cookieParser());
server.use(session({ secret: "my session secret" }));



const authRoutes = require('./routes/authRoutes');


const homeRoutes = require('./routes/homeRoutes');

const friendRoutes = require('./routes/friendRoute');

const challengeRoutes=require('./routes/Challenge');

const leaderRoutes=require("./routes/leaderboardRoute");

const habitRoutes=require('./routes/habitRoutes');

const avatarRoutes=require("./routes/avatarRoutes");

const potionRoutes=require('./routes/potionRoutes');

const shopRoutes=require('./routes/shopRoutes');

const adminRoutes=require('./routes/adminRoutes');



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

        const users = await Users.find();

        users.forEach(async user => {
            const currentDate = new Date();
    
            user.inventory = user.inventory.filter(item => {
                if (item.expirationDate && currentDate > item.expirationDate) {
                    console.log(`Potion with ID ${item.potionId} expired for user ${user.username}.`);
                    return false; // Remove expired potion
                }
                return true;
            });
    
            await user.save();
        });
    
        console.log('Potion expiration cleanup completed!');

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





// rooutes for the login,signup and 
server.use('/', authRoutes);

// endpoint for the home routes 
server.use('/', homeRoutes);

server.get('/', (req, res) => {
    res.render('Registration/login');
});


//endpoint for the friend request 
server.use('/', friendRoutes);

//  endpoint for the challenegeRoutes
server.use('/',challengeRoutes);
// endpoint for the leaderpoint
server.use('/',leaderRoutes);
// endpoitn for the habits 
server.use('/',habitRoutes);


server.use('/',adminRoutes);

server.use('/',avatarRoutes);

server.use('/',potionRoutes);

server.use('/',shopRoutes);




server.listen(5000,()=>{
    console.log("Server running on port http://localhost:5000")
})
let connectionString='mongodb+srv://Fahad_Aziz200:VeFndbmK4qGVaToB@cluster0.l31sl.mongodb.net/';
mongoose.connect(connectionString)
.then(console.log('Successfully connected to '+connectionString))
.catch(err=>console.log("error occured : \n"+err));