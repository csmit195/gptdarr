import logger from '../modules/log.js';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/config.js';

class RadarrController {
    constructor() {
        this.radarrUrl = config.get(['radarr', 'url']) || 'http://localhost:7878';
        this.radarrApiKey = config.get(['radarr', 'apiKey']);
        this.qualityProfileId = config.get(['radarr', 'qualityProfileId']) || 1;
        this.forceSearchOnExisting = config.get(['radarr', 'forceSearchOnExisting']) || true;
        this.rootFolder = path.normalize(config.get(['radarr', 'rootFolder']));

        logger.raw(this);

        if (!this.radarrUrl.endsWith('/api/v3')) {
            this.radarrUrl = `${this.radarrUrl}/api/v3`;
        }

        if (!this.radarrApiKey) {
            logger.error('radarr', 'Radarr API key is not set', new Error('Radarr API key is not set'));
            process.exit(1);
        }

        // check if root folder exists
        if (!fs.existsSync(this.rootFolder)) {
            logger.error('radarr', 'Radarr root folder does not exist', new Error('Radarr root folder does not exist'));
            process.exit(1);
        }

        this.rootFolder = this.rootFolder.replace(/\/$/, '');
    }

    async lookup(movieName, movieYear) {
        try {
            const response = await fetch(`${this.radarrUrl}/movie/lookup?term=${encodeURIComponent(movieName)}%20(${movieYear})`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-key': this.radarrApiKey
                }
            });
            
            const data = await response.json();
            
            // Log the lookup request
            logger.lookupContent('radarr', { movieName, movieYear }, { 
                statusCode: response.status,
                resultsCount: data.length 
            });
            
            return data;
        } catch (error) {
            console.error('Error in lookup method:', error);
            logger.error('radarr', `Error looking up movie: ${movieName} (${movieYear})`, error);
            throw error;
        }
    }

    async checkQueueStatus(movieId) {
        try {
            const response = await fetch(`${this.radarrUrl}/queue/details?movieId=${movieId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-key': this.radarrApiKey
                }
            });
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const status = data[0].status?.toLowerCase();
                if (status === 'downloading') {
                    return { status: 'downloading', message: 'Movie is already downloading' };
                } else if (status === 'importing') {
                    return { status: 'importing', message: 'Movie is importing, wait a few minutes' };
                }
            }
            return null;
        } catch (error) {
            logger.error('radarr', `Error checking queue status for movie ID: ${movieId}`, error);
            return null;
        }
    }

    async add(movieName, movieYear) {
        try {
            console.log('Adding movie', movieName, movieYear);
            logger.log('info', 'radarr', { message: `Attempting to add movie: ${movieName} (${movieYear})` });
            
            const lookup = await this.lookup(movieName, movieYear);
    
            if (!lookup || lookup.length === 0) {
                console.log('No results found for', movieName, movieYear);
                const result = this.generateResponseStructure(false, 'No results found', movieName, movieYear);
                logger.addContent('radarr', { movieName, movieYear }, result, false);
                return result;
            }
    
            const request = this.buildRequestObject(lookup[0]);
            logger.log('info', 'radarr', { message: `Request object: ${JSON.stringify(request)}` });

            // Check queue status before attempting to add
            if (request.id) {
                const queueStatus = await this.checkQueueStatus(request.id);
                if (queueStatus) {
                    const result = this.generateResponseStructure(false, queueStatus.message, request.title, request.year, request.imdbId, request.tmdbId);
                    logger.addContent('radarr', { movieName, movieYear }, result, false);
                    return result;
                }
            }

            if (typeof request.id !== 'undefined') {
                let msg = 'Movie exists, but isn\'t downloaded';
                let hasFile = request.movieFileId !== 0;

                // log the entire request object
                if ( !request.isAvailable ) {
                    msg = 'Movie is not out yet, still in cinemas or production.';
                } else if ( hasFile ) {
                    msg = 'Movie already exists, doing nothing!';
                } else if ( !hasFile && request.isAvailable && this.forceSearchOnExisting ) {
                    const url = `${this.radarrUrl}/command`;
                    const postdata = {
                        "name":"MoviesSearch",
                        "movieIds":[request.id]
                    };

                    logger.log('api', 'radarr', { 
                        operation: 'movie-search', 
                        movieId: request.id,
                        title: request.title 
                    });
                    
                    const response = await fetch(url, {
                        method: 'POST',
                        body: JSON.stringify(postdata),
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Api-key': this.radarrApiKey
                        }
                    });

                    if ( response.status === 201 ) {
                        msg = 'Movie is downloading now';
                    } else {
                        msg = 'An error has occurred';
                        logger.log('error', 'radarr', { 
                            operation: 'movie-search-result',
                            response: response,
                            title: request.title 
                        }, false);
                    }
                    
                    logger.log('api', 'radarr', { 
                        operation: 'movie-search-result', 
                        statusCode: response.status,
                        title: request.title 
                    }, response.ok);
                }

                const result = this.generateResponseStructure(false, msg, request.title, request.year, request.imdbId, request.tmdbId);
                logger.addContent('radarr', { movieName, movieYear }, result, false);
                return result;
            }
    
            const response = await this.sendMovieToRadarr(request);
    
            if (response.status === 201) {
                const result = this.generateResponseStructure(true, 'Movie added and downloading', request.title, request.year, request.imdbId, request.tmdbId);
                logger.addContent('radarr', { movieName, movieYear }, result, true);
                return result;
            }
    
            const errors = await response.json();
            const result = this.generateResponseStructure(false, 'Error adding movie', request.title, request.year, request.imdbId, request.tmdbId, errors);
            logger.addContent('radarr', { movieName, movieYear }, result, false);
            return result;
    
        } catch (error) {
            console.error('Error in add method:', error);
            logger.error('radarr', `Error adding movie: ${movieName} (${movieYear})`, error);
            const result = this.generateResponseStructure(false, 'Unexpected error occurred');
            return result;
        }
    }

    async bulkAdd(movieList) {
        logger.log('info', 'radarr', { message: `Attempting to add ${movieList.length} movies` });
        let results = [];
        for (const movie of movieList) {
            const result = await this.add(movie.title, movie.year);
            results.push(result);
        }
        return results;
    }

    generateResponseStructure(success, message, title = '', year = '', imdbId = '', tmdbId = '', errors = null) {
        return {
            success,
            message,
            title,
            year,
            imdbId,
            tmdbId,
            errors
        };
    }

    buildRequestObject(lookupResult) {
        const normalizedFolder = path.normalize(lookupResult.folder);
        return {
            ...lookupResult,
            qualityProfileId: this.qualityProfileId,
            profileId: this.qualityProfileId,
            path: path.normalize(path.join(this.rootFolder, normalizedFolder)),
            monitored: true,
            minimumAvailability: 'released',
            addOptions: {
                ignoreEpisodesWithFiles: false,
                ignoreEpisodesWithoutFiles: false,
                searchForMovie: true
            }
        };
    }

    async sendMovieToRadarr(request) {
        try {
            console.log('Sending movie to Radarr:', request.title);
            const url = `${this.radarrUrl}/movie`;
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(request),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-key': this.radarrApiKey
                }
            });
            
            logger.log('api', 'radarr', {
                operation: 'add-movie',
                title: request.title,
                statusCode: response.status
            }, response.ok);
            
            return response;
        } catch (error) {
            logger.error('radarr', `Error sending movie to Radarr: ${request.title}`, error);
            throw error;
        }
    }
}

export default RadarrController;