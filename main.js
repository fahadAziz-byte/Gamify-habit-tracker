import serverless from 'serverless-http';
import express from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

// 2. INTERNAL IMPORTS (Added .js extensions - required for ES Modules)
import connectDB from './db.js';
import Users from './models/usersModel.js';
import Requests from './models/friendRequest.js';
import Challenges from './models/challenges.js';
import Potion from './models/Potion.js';
import Habit from './models/habits.js';
import Avatar from './models/avatar.js';
import DailyStreaks from './models/dailyStreaks.js';
import Leaderboard from './models/leaderboard.js';
import calculateCoinsForStreak from './public/javascript/calculateCoins.js';
import calculatePoints from './public/javascript/calculatePoints.js';
import auth from './middleware/auth.js';
import cors from 'cors';
dotenv.config();
const server = express();

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to fix relative redirects on AWS API Gateway
server.use((req, res, next) => {
    const originalRedirect = res.redirect;
    res.redirect = function (status, url) {
        let redirectUrl = url || status;
        let statusCode = typeof status === 'number' ? status : 302;

        // serverless-http attaches apiGateway to the req object
        if (req.apiGateway && req.apiGateway.event && req.apiGateway.event.requestContext && req.apiGateway.event.requestContext.stage) {
            const stage = req.apiGateway.event.requestContext.stage;
            if (typeof redirectUrl === 'string' && redirectUrl.startsWith('/') && !redirectUrl.startsWith(`/${stage}`)) {
                redirectUrl = `/${stage}${redirectUrl}`;
            }
        }

        return originalRedirect.call(this, statusCode, redirectUrl);
    };
    next();
});

server.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
server.options('*', cors());

// 3. SETTINGS
server.set('view engine', 'ejs');
server.use(express.urlencoded({ extended: true }));
server.use(express.json());
server.use(cookieParser());

import MongoStore from 'connect-mongo';

server.use(session({
    secret: "my session secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI  // sessions saved in MongoDB
    })
}));

server.use(express.static('public'));
server.use(express.static('uploads'));

server.use(async (req, res, next) => {
    try {
        await connectDB(); // Ensures DB is ready before hitting routes
        next();
    } catch (err) {
        res.status(500).json({ error: "Database connection failed" });
    }
});


import multer from 'multer';
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./uploads");
    },
    filename: function (req, file, cb) {
        cb(null, `${file.originalname}`);
    },
});
const upload = multer({ storage: storage });

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
        await connectDB();
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
        else {
            console.log('Already performed updates today')
        }
    } catch (error) {
        console.error("Error during daily updates check:", error);
    }
}



server.get('/', (req, res) => {
    res.render('Registration/login');
})




server.get('/home', auth, async (req, res) => {
    try {
        const user = await Users.findOne({ username: req.cookies.username });
        if (!user) return res.status(404).send('User not found');
        res.render('Homepage', { user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

server.post('/signup', async (req, res) => {
    let data = req.body;
    let newUser = Users(data);



    try {
        const doesUserExistAlready = await Users.findOne({ username: newUser.username });

        if (doesUserExistAlready) {
            return res.render('Registration/login', { error: 'User already exists' });
        }
        await newUser.save();
        res.cookie('username', newUser.username, {
            maxAge: (3600 * (1000)),
            httpOnly: true,
            secure: true,
            sameSite: 'Strict'
        });
        req.cookies.username = newUser.username;
        const user = await Users.findOne({ username: req.cookies.username });
        return res.redirect('/home');
    } catch (error) {
        console.error("Error occurred:", error);
        return res.status(500).send('An unexpected error occurred.');
    }
})

server.post('/login', async (req, res) => {
    let data = req.body;
    let isUserValid = new Users(data);
    if (await Users.findOne({ username: isUserValid.username, password: isUserValid.password })) {
        req.cookies.username = req.cookies.username;

        res.cookie('username', isUserValid.username, {
            maxAge: 3600000,
            httpOnly: true,
            secure: true,
            sameSite: 'Strict'
        });
        return res.redirect('/home');
    }
    return res.render('Registration/login', { error: 'No Such User exists' });
})

server.get('/logout', (req, res) => {
    res.clearCookie('username');
    res.redirect('/');
})

server.get('/friendRequests', auth, async (req, res) => {
    const sentRequests = await Requests.find({ senderUsername: req.cookies.username });
    const currentUser = await Users.findOne({ username: req.cookies.username });
    const receivedRequests = await Requests.find({ receiverUsername: req.cookies.username });
    const senderUsernames = receivedRequests.map(req => req.senderUsername);
    const requestors = await Users.find({ username: { $in: senderUsernames } });
    try {


        const friendsList = await Users.find({ username: { $in: currentUser.friends } });
        const suggestedFriendsList = await Users.find({ username: { $nin: currentUser.friends } });
        res.render('friendRequests.ejs', { friendsList, suggestedFriendsList, requests: requestors, sentRequests, user: currentUser });
    } catch (err) {
        const suggestedFriendsList = await Users.find();
        res.render('friendRequests.ejs', { suggestedFriendsList, currentUser, requests: requestors, sentRequests, user: currentUser });
    }

})

server.get('/addFriend/:username/:currusername', async (req, res) => {
    const receiverUsername = req.params['username'];
    const senderUsername = req.params['currusername'];
    const newRequest = new Requests({
        senderUsername,
        receiverUsername
    })
    await newRequest.save();
    res.redirect('/friendRequests');
})

server.get('/confirmRequests/:senderUsername/:receiverUsername', async (req, res) => {
    const receiver = await Users.findOne({ username: req.params['receiverUsername'] });
    const sender = await Users.findOne({ username: req.params['senderUsername'] });
    receiver.friends.push(req.params['senderUsername']);
    sender.friends.push(req.params['receiverUsername']);
    await receiver.save();
    await sender.save();
    await Requests.findOneAndDelete({
        receiverUsername: req.params['receiverUsername'],
        senderUsername: req.params['senderUsername']
    });
    res.redirect('/friendRequests');
})

server.get('/deleteRequest/:senderUsername/:receiverUsername', async (req, res) => {
    await Requests.findOneAndDelete({
        receiverUsername: req.params['receiverUsername'],
        senderUsername: req.params['senderUsername']
    });
    res.redirect('/friendRequests');
})

server.get('/progress', (req, res) => {
    console.log(req.cookies.username);
    res.render('progressBar');
})



server.get('/createChallenge', auth, async (req, res) => {
    const currentUser = await Users.findOne({ username: req.cookies.username });
    const participants = await Users.find({ username: { $in: currentUser.friends } });
    res.render('createChallenge', { participants });
})

server.post('/createChallenge', auth, async (req, res) => {
    try {
        const { title, description, startDate, endDate, difficulty, category, targetGoal, points, participants } = req.body;

        // Transform participants into objects with `username` and `status`
        const normalizedParticipants = Array.isArray(participants)
            ? participants
            : [participants];

        // Transform participants into objects with `username` and `status`
        const formattedParticipants = normalizedParticipants.map(participant => ({
            username: participant,
            status: "pending",
        }));

        let creator = req.cookies.username;

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

server.get('/Challenges', auth, async (req, res) => {
    const user = await Users.findOne({ username: req.cookies.username });
    res.render('Challenges', { user });
})


server.get('/challengeRequests', auth, async (req, res) => {
    const currentUser = await Users.findOne({ username: req.cookies.username });
    const challenges = await Challenges.find({
        participants: {
            $elemMatch: { username: currentUser.username, status: "pending" }
        }
    });

    res.render('challengeRequests', { challenges });
});

server.post('/acceptChallenge/:id', auth, async (req, res) => {
    const challengeId = req.params.id; await Challenges.updateOne(
        { _id: challengeId, "participants.username": req.cookies.username },
        { $set: { "participants.$.status": "accepted" } }
    );

    res.redirect('/challengeRequests');
});

server.post('/declineChallenge/:id', auth, async (req, res) => {
    const challengeId = req.params.id;
    await Challenges.updateOne(
        { _id: challengeId, "participants.username": req.cookies.username },
        { $set: { "participants.$.status": "declined" } }
    );

    res.redirect('/challengeRequests');
});

server.get('/viewChallenges', auth, async (req, res) => {
    try {

        const challenges = await Challenges.find({
            "participants.username": req.cookies.username,
        });

        res.render('viewChallenges', { challenges, currentUsername: req.cookies.username });
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to fetch challenges.");
    }
});

server.post("/completeChallenge", auth, async (req, res) => {
    try {
        const challengeId = req.body.challengeId;
        const basePoints = Number(req.body.points);
        console.log('Challenge bonus points : ' + basePoints);
        await Challenges.updateOne(
            { _id: challengeId, "participants.username": req.cookies.username },
            { $set: { "participants.$.status": "completed" } }
        );


        const requsername = req.cookies.username;
        const user = await Users.findOne({ username: req.cookies.username })
        req.cookies.username.coins += (basePoints) / 4;
        const bonusPoints = calculatePoints(basePoints, user);
        const leaderboardResult = await Leaderboard.findOneAndUpdate(
            { username: requsername },
            { $inc: { points: bonusPoints } },
            { upsert: true, new: true }
        );

        if (leaderboardResult.points >= leaderboardResult.level * 100) {
            await Leaderboard.updateOne({ username: req.cookies.username }, { $inc: { level: 1 } });
        }

        console.log("Challenge completed! Bonus points added.");
        res.redirect('/viewChallenges')
    } catch (error) {
        console.error("Error updating leaderboard for challenge:", error);
        res.status(500).send("An error occurred while completing the challenge.");
    }
});


server.get("/leaderboard", auth, async (req, res) => {
    try {
        const leaderboard = await Leaderboard.find().sort({ points: -1 }).limit(10);
        const user = await Users.findOne({ username: req.cookies.username })
        res.render("leaderboard", { leaderboard, user });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.status(500).send("Error loading leaderboard.");
    }
});


server.get('/habits', auth, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    console.log(today);
    const user = await Users.findOne({ username: req.cookies.username });
    const habits = await Habit.find({ username: req.cookies.username });

    const dueHabits = habits.filter(habit => habit.isCompletedToday != true);
    const completedHabits = habits.filter(habit => habit.isCompletedToday == true);

    res.render('habits/habits', { habits, dueHabits, completedHabits, user });
});

server.get("/createHabit", auth, (req, res) => {
    res.render("habits/createHabit");
})



dotenv.config();
const apiKey = process.env.GEMINI_API_KEY; // Ensure you have set this in your .env file

const genAI = new GoogleGenerativeAI(apiKey);
const generationConfig = {
    temperature: 0.3, // Lower temperature for more deterministic validation
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
};
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest", // or "gemini-pro"
    generationConfig,
    safetySettings
});


// Helper function to ask Gemini and parse a simple keyword response
async function askGeminiSimple(promptText, expectedKeywords) {
    try {
        const result = await model.generateContent(promptText);
        const response = await result.response;
        const text = response.text().trim().toUpperCase(); // Normalize for easy checking

        for (const keyword of expectedKeywords) {
            if (text.includes(keyword.toUpperCase())) {
                return keyword; // Return the keyword found
            }
        }
        console.warn(`Gemini response did not contain expected keywords. Response: "${text}" Prompt: "${promptText}"`);
        return "UNKNOWN_RESPONSE"; // Fallback if no keyword matched
    } catch (error) {
        console.error("Error calling Gemini API:", error);
    }
}



server.post("/createHabit", auth, async (req, res) => {
    const user = await Users.findOne({ username: req.cookies.username });
    const habits = await Habit.find({ username: req.cookies.username });
    const dueHabits = habits.filter(habit => habit.isCompletedToday != true);
    const completedHabits = habits.filter(habit => habit.isCompletedToday == true);
    const habitName = req.body.title.trim();
    const habitDescription = req.body.description.trim();
    if (!habitName || !habitDescription) {
        return res.render('habits/habits.ejs', {
            habits, dueHabits, completedHabits, user,
            message: 'Please provide both a habit name and description.',
            messageType: 'error'
        });
    }

    try {
        // --- Step 1: Validate if it's a real habit ---
        const validationPrompt = `
            Habit Name: "${habitName}"
            Habit Description: "${habitDescription}"

            Based on the name and description, is this a recognizable human habit, or does it seem like random, nonsensical input (e.g., just numbers, random characters, gibberish)?
            Your entire response should be ONLY one of the following keywords:
            - REAL_HABIT
            - INVALID_INPUT
        `;

        console.log("Sending validation prompt to Gemini...");
        const validationResult = await askGeminiSimple(validationPrompt, ["REAL_HABIT", "INVALID_INPUT"]);
        console.log("Gemini validation result:", validationResult);

        if (validationResult === "INVALID_INPUT" || validationResult === "UNKNOWN_RESPONSE") {
            return res.render('habits/habits.ejs', {
                habits, dueHabits, completedHabits, user,
                message: `The input "${habitName}" doesn't seem like a valid habit. Please enter a recognizable habit.`,
                messageType: 'error'
            });
        }

        // --- Step 2: Check if the habit is good (only if Step 1 passed) ---
        const goodnessPrompt = `
            Habit Name: "${habitName}"
            Habit Description: "${habitDescription}"

            Considering this habit, would it generally be considered a 'GOOD_HABIT' (beneficial, positive for well-being/productivity) or a 'BAD_HABIT' (detrimental, harmful, or generally unproductive)?
            Ignore any moral judgments, focus on general well-being and common understanding.
            Your entire response should be ONLY one of the following keywords:
            - GOOD_HABIT
            - BAD_HABIT
        `;

        console.log("Sending goodness prompt to Gemini...");
        const goodnessResult = await askGeminiSimple(goodnessPrompt, ["GOOD_HABIT", "BAD_HABIT"]);
        console.log("Gemini goodness result:", goodnessResult);

        if (goodnessResult === "BAD_HABIT" || goodnessResult === "UNKNOWN_RESPONSE") {
            return res.render('habits/habits.ejs', {
                habits, dueHabits, completedHabits, user,
                message: `The habit "${habitName}" is generally not considered a good habit. Please focus on positive habits.`,
                messageType: 'error'
            });
        }

        // --- If both checks pass: Add to "Habit Model" (simulation) ---
        if (goodnessResult === "GOOD_HABIT") {
            console.log(`SUCCESS: Habit "${habitName}" is valid and good. Adding to model.`);
            let data = req.body;
            data.username = req.cookies.username;
            let newHabit = new Habit(data);
            await newHabit.save();
            res.redirect('/habits');
        }

    } catch (error) {
        console.error("Error during habit creation:", error);
        return res.render('habits/habits.ejs', {
            habits, dueHabits, completedHabits, user,
            message: 'An error occurred while creating the habit. Please try again.',
            messageType: 'error'
        });
    }
});

server.get("/checkInHabit/:_id", auth, async (req, res) => {
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

        const user = await Users.findOne({ username: req.cookies.username });
        const basePoints = 5;
        const pointsToAdd = calculatePoints(basePoints, user);
        const leaderboardResult = await Leaderboard.findOneAndUpdate(
            { username: req.cookies.username },
            { $inc: { points: pointsToAdd } },
            { upsert: true, new: true }
        );
        if (leaderboardResult.points >= leaderboardResult.level * 100) {
            await Leaderboard.updateOne({ username: req.cookies.username }, { $inc: { level: 1 } });
        }

        let habit = await Habit.findOne({ _id: req.params._id });
        const coins = calculateCoinsForStreak(habit.streak);
        if (coins > 0) {
            const user = await Users.findOne({ username: habit.username });
            user.coins += coins;
            await user.save();
        }

        res.redirect('/habits');
    } catch (error) {
        console.error("Error updating habit and leaderboard:", error);
        res.status(500).send("An error occurred while checking in the habit.");
    }
});


server.get('/removeHabit/:_id', auth, async (req, res) => {
    await Habit.deleteOne({ _id: req.params._id });
    res.redirect('/habits');
})

server.post('/shop/buy-avatar/:id', auth, async (req, res) => {
    try {
        const avatar = await Avatar.findOne({ _id: req.params.id });
        console.log(avatar);
        const user = await Users.findOne({ username: req.cookies.username }); // Assuming req.user contains authenticated user details

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
});

server.post('/shop/buy-potion/:potionId', auth, async (req, res) => {

    try {
        const user = await Users.findOne({ username: req.cookies.username }); // Assuming req.user contains authenticated user data
        const potion = await Potion.findOne({ _id: req.params.potionId });

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
});

server.get('/admin', auth, async (req, res) => {
    const avatar = await Avatar.find();
    const potion = await Potion.find();
    const user = await Users.findOne({ username: req.cookies.username });
    res.render('admin/admin.ejs', { avatar, potion, userAvatarId: user.avatar.avatarId })
})

server.get('/createPotion', auth, async (req, res) => {
    res.render('admin/newPotionForm.ejs');
})

server.post('/createPotion', upload.single("file"), async (req, res) => {
    let data = {
        name: req.body.name,
        effectType: req.body.effectType,
        duration: Number(req.body.duration),
        cost: Number(req.body.cost),
        description: req.body.description,
        imageURL: req.file ? req.file.filename : req.body.imageURL
    };
    let newPotion = new Potion(data);
    await newPotion.save();
    res.redirect('/admin');
})

server.get('/editAvatar/:id', auth, async (req, res) => {
    const avatar = await Avatar.findOne({ _id: req.params.id });
    res.render('admin/editAvatarForm', { avatar, avatarId: req.params.id });
})

server.get('/deleteAvatar/:id', auth, async (req, res) => {
    await Avatar.deleteOne({ _id: req.params.id });
    res.redirect('/admin');
});

server.post('/editAvatar/:id', upload.single("file"), auth, async (req, res) => {
    const avatar = await Avatar.findOne({ _id: req.params.id });
    let data = req.body;
    avatar.name = data.name;
    avatar.cost = data.cost;
    avatar.description = data.description;
    if (req.file) {
        avatar.imageURL = req.file.filename;
    }
    await avatar.save();
    res.redirect('/admin');
})

server.get('/createAvatar', (req, res) => {
    res.render('admin/newAvatarForm.ejs');
})

server.post('/createAvatar', upload.single("file"), async (req, res) => {
    let data = req.body;
    let newAvatar = new Avatar(data);
    if (req.file) {
        newAvatar.imageURL = req.file.filename;
    }
    await newAvatar.save();
    res.redirect('/admin');
})

server.get('/shop', auth, async (req, res) => {
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

    res.render('shop', { purchasedPotions, notPurchasedPotions, avatars, user, userAvatar });
});

server.get('/inventory', auth, async (req, res) => {
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
    res.render('inventory', { userAvatar, user, potions: user.inventory });
});



server.post('/activatePotion/:id', auth, async (req, res) => {
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
});

server.get('/debug', (req, res) => {
    res.json({
        status: 'working',
        session: req.session,
        cookies: req.cookies,
        headers: req.headers,
        mongoUri: !!process.env.MONGO_URI
    });
});


if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const PORT = 3000;

    // Connect to DB FIRST, then start the server
    connectDB().then(async () => {
        await checkAndPerformDailyUpdates();
        server.listen(PORT, () => {
            console.log(`✅ Database Connected & Local server running at http://localhost:${PORT}`);
        });
    }).catch(err => {
        console.error("Failed to connect to DB at startup:", err);
    });
}

const serverlessHandler = serverless(server);

// This is the actual function AWS Lambda calls
export const handler = async (event, context) => {

    // --- THIS IS POINT 3 ---
    // We tell AWS: "Don't wait for the MongoDB connection to close."
    // Without this, AWS keeps the "timer" running and charges you more money.
    context.callbackWaitsForEmptyEventLoop = false;

    // Now run your Express app logic
    const result = await serverlessHandler(event, context);

    return result;
};
