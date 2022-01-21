import fetch from 'node-fetch';
import EmailValidator from 'email-deep-validator';
import nodemailer from 'nodemailer';

import Score from './models/score.js';
import CCGameSession from './models/ccGameSession.js';
import crypto from 'crypto';

const emailValidator = new EmailValidator({verifyMailbox: false});

export const getLeaderboard = async (req, res) => {
    try{
        const pageSize = 10;
        let pageNum;
        // console.log(typeof req.query.page);
        if(typeof req.query.page !== 'undefined'){
            pageNum = parseInt(req.query.page);
        }
        else{
            pageNum = 1;
        }
        const limit = pageNum * pageSize;

        // puts all the scores it finds into a list, sorted by score descending
        const easyLeaderboard = await Score.find({difficulty: "easy"}, "-scoreToken -token", {limit: limit}).sort({score: -1});
        const normalLeaderboard = await Score.find({difficulty: "normal"}, "-scoreToken -token", {limit: limit}).sort({score: -1});
        const hardLeaderboard = await Score.find({difficulty: "hard"}, "-scoreToken -token", {limit: limit}).sort({score: -1});
        res.status(200).json({
            easy: easyLeaderboard.slice((pageNum - 1) * pageSize, pageNum * pageSize),
            normal: normalLeaderboard.slice((pageNum - 1) * pageSize, pageNum * pageSize),
            hard: hardLeaderboard.slice((pageNum - 1) * pageSize, pageNum * pageSize)
        });
    }
    catch(e){
        console.error(e);
        res.status(404).send("leaderboard not found.");
    }
}

export const postScore = async (req, res) => {
    try{
        const newScore = new Score(req.body);

        if(!req.body.name) throw new Error("no name provided.");
        if(req.body.score == null) throw new Error("no score provided.");
        if(!req.body.difficulty) throw new Error("no difficulty provided.");
        if(!req.body.scoreToken) throw new Error("no scoreToken provided.");
        if(!req.body.token) throw new Error("no token provided.");
        
        const NAME_MAX_LENGTH = 30;
        
        if(newScore.name.length > NAME_MAX_LENGTH) throw new Error(`name provided is longer than ${NAME_MAX_LENGTH} characters.`);
        if(["easy", "normal", "hard"].indexOf(newScore.difficulty.toLowerCase()) < 0)
        throw new Error("difficulty provided is invalid.");
        if(!Number.isInteger(newScore.score) || newScore.score < 0 || newScore.score > 100_000_000)
        throw new Error("score provided is invalid.");
        
        let allowedChars = "abcdefghijklmnopqrstuvwxyz1234567890!@#$%^&*-_+=~ ";
        for(let i = 0; i < newScore.name.length; i++){
            if(allowedChars.indexOf(newScore.name.toLowerCase()[i]) < 0)
            throw new Error("name has invalid characters. Use only letters, numbers, and the following symbols: -_+=~!@#$%^&*");
        }
        
        const session = await CCGameSession.findOne({token: req.body.token});
        
        // console.log(session);
        
        if(!session) throw new Error("Game session token is invalid.");
        
        // if its not possible for the player to have gotten as high a score
        // as they claim within the time since their token was issued
        // this check is quite generous, giving a lot of leeway and assuming the player was on hard mode
        if(Math.floor(Date.now() / 1000) - session.initialTimestamp < newScore.score / 2)
            throw new Error("Score invalid: cheating detected.");
        
        // if the player didn't check-in within the last 45 seconds (they should check in every 30 seconds, but the extra time is for padding for slower connections)
        if(Math.floor(Date.now() / 1000) - session.lastCheckInTimestamp > 45)
            throw new Error("Score invalid; check-in not current.");
        
        const userScoresAtDifficulty = await Score.find({difficulty: req.body.difficulty, scoreToken: req.body.scoreToken}, null, {}).sort({score: -1});

        // console.log(userScoresAtDifficulty[0]);
        
        // change their name everywhere
        await Score.updateMany({ scoreToken: req.body.scoreToken }, { name: req.body.name });

        // if there isn't a score with the given scoreToken yet
        if (userScoresAtDifficulty.length === 0){
            newScore.save()
                .then(() => {
                    res.status(200).send(newScore);
                })
                .catch(e => console.error(e));
        }
        // if this is a new high score for this scoreToken
        else if (req.body.score > userScoresAtDifficulty[0].score){
            let r = await Score.updateOne({ _id: userScoresAtDifficulty[0]._id }, { score: req.body.score });
            res.status(200).json(r);
        }
        else{
            let msg = "This score is not a new high score.";
            res.statusMessage = msg;
            res.status(409).send(msg);
        }
    }
    catch(e){
        console.error(`Error: ${e.message}`);
        res.statusMessage = e.message;
        res.status(400).send(`The POST request could not be processed: ${e.message}`);
    }
}

export const getCCToken = async (req, res) => {
    try{
        let s = crypto.randomBytes(16).toString('hex');

        const ccGameSession = new CCGameSession({
            token: s,
            initialTimestamp: Math.floor(Date.now() / 1000),
            lastCheckInTimestamp: Math.floor(Date.now() / 1000)
        });

        ccGameSession.save()
            .then()
            .catch(e => console.error(e));
        res.status(200).send({token: s});
    }
    catch(e){
        console.error(e);
        res.status(400).send(e);
    }
}

// we expect to get pings for each token every 30 seconds
export const checkinCC = async (req, res) => {
    try{
        if(Object.keys(req.body).length !== 1)
            throw new Error("Invalid number of parameters.");
        
        let doc = await CCGameSession.updateOne(
            { token: req.body.token },
            { lastCheckInTimestamp: Math.floor(Date.now() / 1000) }
        );
        if (doc.n === 0) throw new Error("checkinCC: token does not exist.");
        res.status(200).send();
    }
    catch(e){
        console.error(e);
        res.status(400).send("Error: invalid checkin.");
    }
}

export const getAndySubs = async (req, res) => {
    let url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=UCgd3Z7ShK-HME-gCxC-OaTQ&key=${process.env.YOUTUBE_API_KEY}`;
    let options = { method: 'GET' };
    let thing = fetch(url, options)
    .then((r) => r.json())
    .then(json => res.status(200).json(json));
}

export const postContact = async (req, res) => {
    try{
        // check for correct request format (correct keys)
        const correctKeys = ["email", "subject", "message"].sort();
        const inputKeys = Object.keys(req.body).sort();
        if(JSON.stringify(correctKeys) !== JSON.stringify(inputKeys)){
            throw new Error("Invalid parameters");
        }

        // validate email address
        const { wellFormed, validDomain } = await emailValidator.verify(req.body.email);
        // console.log(wellFormed, validDomain);

        // if email is valid
        if(wellFormed && validDomain){
            // send an email to myself (using a dedicated server email, not my personal email of course)

            // authorize
            let transporter = nodemailer.createTransport({
                service: process.env.SERVER_EMAIL_SERVICE,
                auth: {
                    user: process.env.SERVER_EMAIL,
                    pass: process.env.SERVER_EMAIL_PASS
                }
            });

            // represent email as object
            let mailOptions = {
                from: process.env.SERVER_EMAIL,
                to: process.env.SERVER_EMAIL,
                subject: req.body.subject,
                text: `from: ${req.body.email}\n\n${req.body.message}`
            }

            // send email
            transporter.sendMail(mailOptions, (err, info) => {
                if(err){
                    console.log(err);
                }
                else{
                    console.log(`Email sent: ${info.response}`);
                }
            })

            // give an OK response
            res.status(200).send();
        }
        else{
            throw new Error("Invalid email addresss");
        }
    }
    catch(e){
        console.log("POST failed.", e);
        res.status(400).send("POST failed.");
    }
}

export const home = async (req, res) => {
    res.status(200).send("OK");
}

export const teapot = async (req, res) => {
    res.status(418).send("The server refuses the attempt to brew coffee with a teapot");
}