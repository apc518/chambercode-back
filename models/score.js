import mongoose from 'mongoose';

const score =  mongoose.Schema({
    score: Number,
    name: String,
    difficulty: String,
    scoreToken: String // provided clientside, not by user input though
}, { timestamps: true });

const Score = mongoose.model("Score", score, "scores");

export default Score;