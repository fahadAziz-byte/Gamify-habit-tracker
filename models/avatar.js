import mongoose from 'mongoose';

const avatarSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imageURL: { type: String, required: true },
    cost: { type: Number, required: true },
    description: { type: String, required: true },
});

export default mongoose.model('Avatar', avatarSchema);
