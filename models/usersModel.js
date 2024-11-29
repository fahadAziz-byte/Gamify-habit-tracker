const mongoose=require("mongoose");

let usersSchema=mongoose.Schema({
    username:String,
    email:String,
    password:String,
    phonenumber:String,
    age:Number,
    friends:[String],
    habits:[String]
});

let usersModel=mongoose.model('Users',usersSchema);

module.exports=usersModel;



