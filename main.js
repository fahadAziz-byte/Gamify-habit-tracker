const express=require('express');
const server=express();
server.set('view engine','ejs')
server.use(express.urlencoded({extended : true}));
const Users=require('../Gamify-habit-tracker/models/usersModel');
const mongoose = require('mongoose');
let currentUserName='';

server.get('/',(req,res)=>{
    res.render('Registration/login');
})

server.post('/Homepage',async(req,res)=>{
    // Assuming Users is your model
    console.log('hello in server post request');
    const user = await Users.findOne({ username: currentUserName });
    console.log('hello in server post request with user : '+user.username);
    if (!user) {
        console.error(`User with username ${currentUserName} not found`);
        return res.redirect('/');; // Or handle it in another way (e.g., send a response or log)
    }

    // Safely push to the friends array
    user.friends.push(req.body.userage);
    user.age=req.body.userage;
    await user.save()
    return res.render('Homepage');
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
    const currentUser=await Users.findOne({username:currentUserName});
    const suggestedFriendsListArray=currentUser.friends;
    suggestedFriendsListArray.push(currentUser.username);
    const friendsList=await Users.find({username : {$in : currentUser.friends}});
    const suggestedFriendsList=await Users.find({username : {$nin : suggestedFriendsListArray }});
    res.render('friendRequests.ejs',{friendsList,suggestedFriendsList});
})

server.get('/progress',(req,res)=>{
    console.log(currentUserName);
    res.render('progressBar');
})

server.listen(5000,()=>{
    console.log("Server running on port 5000")
})

let connectionString='mongodb://localhost/Users';
mongoose.connect(connectionString)
.then(console.log('Successfully connected to '+connectionString))
.catch(err=>console.log("error occured : \n"+err));