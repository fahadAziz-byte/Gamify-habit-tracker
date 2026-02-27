import mongoose from "mongoose";

// This variable stays alive as long as the Lambda "container" is warm
let cachedConnection = null;

const connectDB = async () => {
    // If we already have a connection, use it! Don't create a new one.
    if (cachedConnection) {
        return cachedConnection;
    }

    // If no connection exists, create one
    try {
        cachedConnection = await mongoose.connect(process.env.MONGO_URI, {
            bufferCommands: false, // Turn off buffering so errors happen immediately
        });
        console.log("New connection established");
        return cachedConnection;
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
};

export default connectDB;