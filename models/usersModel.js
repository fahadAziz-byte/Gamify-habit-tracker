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
            expirationDate: {type:Date},
            imageURL: { type: String },
            description: { type: String },
            cost: { type: Number },
        },
    ],
    avatar: {
    avatarId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Avatar',
        default: new mongoose.Types.ObjectId("67671dc84b9c6c75012d2ae7"),
    },
    imageURL: { type: String ,default:"1734811080392-user-profile-svgrepo-com.svg"},
    }
});

let usersModel=mongoose.model('Users',usersSchema);

module.exports=usersModel;



