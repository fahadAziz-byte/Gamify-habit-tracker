const express=require('express');
const server=express();
server.set('view engine','ejs')
server.use(express.urlencoded({extended : true}));
const Users=require('../Habbit Tracker Project/models/usersModel');
const mongoose = require('mongoose');
let currentUserName='';
server.get('/',(req,res)=>{
    res.render('Registration/login');
})

server.post('/FriendsSuggestion',async(req,res)=>{
    console.log(req.body.userage);
    (await Users.findOne({username : currentUserName})).age=req.body.userage

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