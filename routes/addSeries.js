import express from 'express';
import sonarr from '../modules/sonarr.js';

const router = express.Router();

router.post('/', async (req, res) => {
    const series = req.body.items;

    if (!series || series.length === 0) {
        return res.status(400).json({ message: 'Invalid request' });
    }

    sonarr.bulkAdd(series)
        .then((response) => {
            return res.status(200).json(response);
        })
        .catch((error) => {
            return res.status(500).json(error);
        });
});

export default router;