const mongoose=require("mongoose");

let usersSchema=mongoose.Schema({
    username:String,
    email:String,
    password:String,
    phonenumber:String,
    age:Number,
    friends:[String],
    habits:[String],
    coins:{type:Number,default:0},
    inventory: [
        {
            potionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Potion' },
            effectType: { type: String },
            duration: { type: Number },
            activatedAt: { type: Date },
        },
    ],
});

let usersModel=mongoose.model('Users',usersSchema);

module.exports=usersModel;



