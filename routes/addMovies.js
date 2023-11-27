import express from 'express';
import radarr from '../classes/radarr.js';

const router = express.Router();

router.post('/', async (req, res) => {
    const movies = req.body.items;
    
    if (!movies || movies.length === 0) {
        return res.status(400).json({ message: 'Invalid request' });
    }

    radarr.bulkAdd(movies)
        .then((response) => {
            return res.status(200).json(response);
        })
        .catch((error) => {
            return res.status(500).json(error);
        });
});

export default router;