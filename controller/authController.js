const Users=require("../models/usersModel");

exports.signup=async(req,res)=>{
    let data=req.body;
    let newUser=Users(data);

    
    
    try {
        const doesUserExistAlready = await Users.findOne({ username: newUser.username });

        if (doesUserExistAlready) {
            return res.render('Registration/Login', { error: 'User already exists' });
        }
        await newUser.save();
        res.cookie('username', newUser.username, {
            maxAge: (3600*(1000)), 
            httpOnly: true, 
            secure: true,   
            sameSite: 'Strict' 
        });
        currentUserName=newUser.username;
        const user=await Users.findOne({username:currentUserName});
        return res.render('Homepage',{user});
    } catch (error) {
        console.error("Error occurred:", error);
        return res.status(500).send('An unexpected error occurred.');
    }
}


exports.login=async(req,res)=>{
    let data = req.body;
    let isUserValid=new Users(data);
    if(await Users.findOne({username : isUserValid.username , password : isUserValid.password})){
        currentUserName=req.cookies.username;
        
        res.cookie('username', isUserValid.username, {
            maxAge: 3600000, 
            httpOnly: true, 
            secure: true,   
            sameSite: 'Strict' 
        });
        return res.redirect('/home');
    }
    return res.render('Registration/Login', { error: 'No Such User exists' });
}

exports.logout=(req,res)=>{
    res.clearCookie('username');
    res.redirect('/');
}