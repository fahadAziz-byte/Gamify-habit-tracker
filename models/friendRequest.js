const mongoose=require('mongoose');

let requestSchema=mongoose.Schema({
    senderUsername:{
        type:String,
        required:true
    },
    receiverUsername:{
        type:String,
        required:true
    },
    Date:{
        type:Date,
        default:Date.now()
    }
})

let requests=mongoose.model("Requests",requestSchema);

module.exports=requests;