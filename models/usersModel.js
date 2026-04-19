import mongoose from "mongoose";

let usersSchema = mongoose.Schema({
    username: String,
    email: String,
    password: String,
    phonenumber: String,
    age: Number,
    friends: [String],
    habits: [String],
    coins: { type: Number, default: 15 },
    inventory: [
        {
            potionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Potion' },
            effectType: { type: String },
            duration: { type: Number },
            activatedAt: { type: Date },
            expirationDate: { type: Date },
            imageURL: { type: String },
            description: { type: String },
            cost: { type: Number },
        },
    ],
    avatar: {
        avatarId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Avatar',
            default: new mongoose.Types.ObjectId("67b8a57c0d6e268330339cb5"),
        },
        imageURL: { type: String, default: "https://res.cloudinary.com/dfhxolmgf/image/upload/v1772249477/gamify-habit-tracker/jd6fmxvzmh55l4xwuzkt.svg" },
    }
});

let usersModel = mongoose.model('Users', usersSchema);

export default usersModel;



