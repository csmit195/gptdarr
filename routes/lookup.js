import express from 'express';
import sonarr from '../classes/sonarr.js';
import radarr from '../classes/radarr.js';
import { cleanObject } from '../libary/Utils.js';

const router = express.Router();

router.get('/', async (req, res) => {
    let { title, year } = req.query;
    if (!title) {
        return res.status(400).json({ message: 'title is required' });
    }

    if (!year) {
        year = '';
    }

    const promises = [
        sonarr.lookup(title, year),
        radarr.lookup(title, year)
    ];

    const results = await Promise.all(promises);
    
    results[0] = results[0].map(cleanObject);
    results[1] = results[1].map(cleanObject);

    return res.json({
        shows: results[0],
        movies: results[1]
    });
});

export default router;