import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

import addSeriesRouter from './routes/addSeries.js';
import addMoviesRouter from './routes/addMovies.js';
import lookupRouter from './routes/lookup.js';

dotenv.config();

const app = express();
const port = 8194;

// API Key Validation Middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);

    if (req.path === '/privacy-policy') {
        return next();
    }

    const apiKey = req.header('X-Api-Key');
    if (!apiKey || apiKey !== process.env.PROXY_API_KEY) {
        return res.status(401).json({ message: 'Invalid or missing API key' });
    }
    next();
});

app.use(bodyParser.json())

// Routes
app.use('/addSeries', addSeriesRouter);
app.use('/addMovies', addMoviesRouter);

// Lookup:
app.use('/BulkSearchForMovieAndSeries', lookupRouter);

app.use('/privacy-policy', (req, res) => {
    res.sendFile('public/privacy-policy.html', { root: '.' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});