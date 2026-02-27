import mongoose from 'mongoose';

const potionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    effectType: { type: String, required: true, enum: ['habitMultiplier', 'challengeMultiplier'] },
    duration: { type: Number, required: true }, // Duration is in days
    cost: { type: Number, required: true },
    description: { type: String },
    imageURL: { type: String, required: true },
});

export default mongoose.model('Potion', potionSchema);
