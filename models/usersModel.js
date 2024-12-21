const mongoose=require("mongoose");

let usersSchema=mongoose.Schema({
    username:String,
    email:String,
    password:String,
    phonenumber:String,
    age:Number,
    friends:[String],
    habits:[String],
    coins:{type:Number,default:15},
    inventory: [
        {
            potionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Potion' },
            effectType: { type: String },
            duration: { type: Number },
            activatedAt: { type: Date },
        },
    ],
    avatarId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Avatar',
    },
});

let usersModel=mongoose.model('Users',usersSchema);

module.exports=usersModel;



