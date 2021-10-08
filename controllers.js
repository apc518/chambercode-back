import Score from './models/score.js';
import CCGameSession from './models/ccGameSession.js';

export const getLeaderboard = async (req, res) => {
    try{
        // puts all the scores it finds into a list, sorted by score descending
        const easyLeaderboard = await Score.find({difficulty: "easy"}, null, {limit: 10}).sort({score: -1});
        const normalLeaderboard = await Score.find({difficulty: "normal"}, null, {limit: 10}).sort({score: -1});
        const hardLeaderboard = await Score.find({difficulty: "hard"}, null, {limit: 10}).sort({score: -1});
        res.status(200).json({
            easy: easyLeaderboard,
            normal: normalLeaderboard,
            hard: hardLeaderboard
        });
    }
    catch(e){
        console.error(e);
        res.status(404).send("leaderboard not found.");
    }
}

export const postScore = async (req, res) => {
    try{
        if(Object.keys(req.body).length !== Object.keys(Score.schema.obj).length)
            throw new Error("Invalid number of parameters.");

        const newScore = new Score(req.body);

        if(!newScore.name) throw new Error("no name provided.");
        if(newScore.score == null) throw new Error("no score provided.");
        if(!newScore.difficulty) throw new Error("no difficulty provided.");
        if(!newScore.token) throw new Error("no token provided.");

        if(newScore.name.length > 30) throw new Error("name provided is too long.");
        if(["easy", "normal", "hard"].indexOf(newScore.difficulty.toLowerCase()) < 0)
            throw new Error("difficulty provided is invalid.");
        if(!Number.isInteger(newScore.score) || newScore.score < 0 || newScore.score > 100_000_000)
            throw new Error("score provided is invalid.");

        let allowedChars = "abcdefghijklmnopqrstuvwxyz1234567890!@#$%^&*-_+=~ ";
        for(let i = 0; i < newScore.name.length; i++){
            if(allowedChars.indexOf(newScore.name.toLowerCase()[i]) < 0)
                throw new Error("name has invalid characters. Use only letters, numbers, and the following symbols: -_+=~!@#$%^&*");
        }

        const session = await CCGameSession.findOne({token: newScore.token});

        console.log(session);

        if(!session) throw new Error("No valid token provided.");

        // if its not possible for the player to have gotten as high a score
        // as they claim within the time since their token was issued
        // this check is quite generous, giving a lot of leeway and assuming the player was on hard mode
        if(Math.floor(Date.now() / 1000) - session.initialTimestamp < newScore.score / 2)
            throw new Error("Score invalid: cheating detected.");
        
        // if the player didn't check-in within the last 45 seconds (they should check in every 30 seconds, but the extra time is for padding for slower connections)
        if(Math.floor(Date.now() / 1000) - session.lastCheckInTimestamp > 45)
            throw new Error("Score invalid; check-in not current.");

        newScore.save()
            .then(() => {
                res.status(200).send(newScore);
            })
            .catch(e => console.error(e));
    }
    catch(e){
        console.error(`Error: ${e.message}`);
        res.statusMessage = e.message;
        res.status(400).send(`The POST request could not be processed: ${e.message}`);
    }
}

export const getCCToken = async (req, res) => {
    try{
        let s = "";
        let chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
        for(let i = 0; i < 64; i++){
            s += chars[Math.floor(Math.random() * chars.length)];
        }

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

export const teapot = async (req, res) => {
    res.status(418).send("The server refuses the attempt to brew coffee with a teapot");
}