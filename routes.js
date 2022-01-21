import express from 'express';
import { home, postContact, getLeaderboard, teapot, postScore, deleteScore, getCCToken, checkinCC, getAndySubs} from './controllers.js';

const router = express.Router();

router.get('/', home);
router.get('/leaderboard', getLeaderboard);
router.post('/leaderboard', postScore);
router.delete('/leaderboard/:difficulty/:id', deleteScore);
router.get('/context-collapse-token', getCCToken);
router.post('/context-collapse-checkin', checkinCC);
router.get('/youtubestats/andy', getAndySubs);
router.post('/contact', postContact);
router.get('/teapotcoffee', teapot);

export default router;