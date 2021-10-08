import mongoose from 'mongoose';

const ccGameSession =  mongoose.Schema({
    token: String,
    initialTimestamp: Number, // kept as a unix timestamp in seconds
    lastCheckInTimestamp: Number // last time the client checked in to confirm this is a running game
}, { timestamps: true});

const CCGameSession = mongoose.model("CCGameSession", ccGameSession, "ccGameSessions");

export default CCGameSession;