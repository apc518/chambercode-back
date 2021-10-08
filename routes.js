import express from 'express';
import { getLeaderboard, teapot, postScore, getCCToken, checkinCC} from './controllers.js';

const router = express.Router();

router.get('/leaderboard', getLeaderboard);
router.post('/leaderboard', postScore);
router.get('/context-collapse-token', getCCToken);
router.post('/context-collapse-checkin', checkinCC);
router.get('/teapotcoffee', teapot);

export default router;