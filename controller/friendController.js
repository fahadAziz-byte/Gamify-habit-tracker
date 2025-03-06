
const Requests=require('../models/friendRequest');
const Users=require("../models/usersModel");

exports.friendRequests=async(req,res)=>{
    
    
    
    const sentRequests=await Requests.find({senderUsername : req.cookies.username});
    const requests=await Requests.find({receiverUsername : req.cookies.username});
    const currentUser=await Users.findOne({username:req.cookies.username});
    try{
        const friendsList=await Users.find({username : {$in : currentUser.friends}});
        const suggestedFriendsList=await Users.find({username : {$nin : currentUser.friends }});
        res.render('friendRequests.ejs',{friendsList,suggestedFriendsList,currentUser,requests,sentRequests,user:currentUser});
    }catch(err){
        const suggestedFriendsList=await Users.find();
        res.render('friendRequests.ejs',{suggestedFriendsList,currentUser,requests,sentRequests,user:currentUser});
    }


    
}

exports.addFriend=async(req,res)=>{
    const receiverUsername = req.params['username'];
    const senderUsername = req.params['currusername'];
    const newRequest=new Requests({
        senderUsername,
        receiverUsername
    })
    await newRequest.save();
    res.redirect('/friendRequests');
}

exports.confirmRequest=async(req,res)=>{
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
}



exports.deleteRequest=async(req,res)=>{
    await Requests.findOneAndDelete({
        receiverUsername : req.params['receiverUsername'],
        senderUsername : req.params['senderUsername']
    });
    res.redirect('/friendRequests');
}





