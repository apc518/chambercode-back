import mongoose from 'mongoose';

const score =  mongoose.Schema({
    score: Number,
    name: String,
    difficulty: String,
    token: String
}, { timestamps: true });

const Score = mongoose.model("Score", score, "scores");

export default Score;