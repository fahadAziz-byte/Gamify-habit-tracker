import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './db.js';
import Users from './models/usersModel.js';

dotenv.config();

async function updateAdmins() {
    try {
        await connectDB();
        console.log("Connected to DB, updating users...");
        
        // Find all users where isAdmin does not exist, and set it to false
        const result = await Users.updateMany(
            { isAdmin: { $exists: false } },
            { $set: { isAdmin: false } }
        );
        
        console.log(`Successfully updated ${result.modifiedCount} users to isAdmin: false.`);
    } catch (error) {
        console.error("Error updating users:", error);
    } finally {
        mongoose.disconnect();
    }
}

updateAdmins();
