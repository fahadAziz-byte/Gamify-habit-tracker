const mongoose=require('mongoose');

let requestSchema=mongoose.Schema({
    senderUsername:String,
    receiverUsername:String,
    Date:{
        type:Date,
        default:Date.now()
    }
})

let requests=mongoose.model("Requests",requestSchema);

module.exports={requests};