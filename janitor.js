import CCGameSession from './models/ccGameSession.js';

// every 10 minutes we check for games that haven't pinged the server
// in the last 24 hours, and delete their sessions
export const cleanUp = () => {
    setInterval(async () => {
        await CCGameSession.deleteMany({
            lastCheckInTimestamp: {
                $lte: Math.floor(Date.now() / 1000) - 86400
            }
        });
    }, 10 * 60 * 1000);
}