import fs from 'node:fs';
import logger from '../modules/log.js';
import path from 'node:path';
import { config } from '../config/config.js';

class SonarrController {
    constructor() {
        this.sonarrUrl = config.get(['sonarr', 'url']) || 'http://localhost:8989';
        this.sonarrApiKey = config.get(['sonarr', 'apiKey']);
        this.qualityProfileId = config.get(['sonarr', 'qualityProfileId']) || 1;
        this.languageProfileId = 1;
        this.rootFolder = path.normalize(config.get(['sonarr', 'rootFolder']));

        if (!this.sonarrUrl.endsWith('/api/v3')) {
            this.sonarrUrl = `${this.sonarrUrl}/api/v3`;
        }

        if (!this.sonarrApiKey) {
            logger.error('sonarr', 'Sonarr API key is not set', new Error('Sonarr API key is not set'));
            process.exit(1);
        }

        // check if root folder exists
        if (!fs.existsSync(this.rootFolder)) {
            logger.error('sonarr', 'Sonarr root folder does not exist', new Error('Sonarr root folder does not exist'));
            process.exit(1);
        }

        this.rootFolder = this.rootFolder.replace(/\/$/, '');
    }

    async lookup(seriesName, seriesYear) {
        try {
            const response = await fetch(`${this.sonarrUrl}/series/lookup?term=${seriesName}%20(${seriesYear})`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-key': this.sonarrApiKey
                }
            });
            
            const data = await response.json();
            
            // Log the lookup request
            logger.lookupContent('sonarr', { seriesName, seriesYear }, { 
                statusCode: response.status,
                resultsCount: data.length 
            });
            
            return data;
        } catch (error) {
            logger.error('sonarr', `Error looking up series: ${seriesName} (${seriesYear})`, error);
            throw error;
        }
    }

    async add(seriesName, seriesYear) {
        try {
            const lookup = await this.lookup(seriesName, seriesYear);
    
            if (!lookup || lookup.length === 0) {
                const result = this.generateResponseStructure(false, 'No results found', seriesName, seriesYear);
                logger.addContent('sonarr', { seriesName, seriesYear }, result, false);
                return result;
            }
    
            const request = this.buildRequestObject(lookup[0]);
    
            if (typeof request.id !== 'undefined') {
                const result = this.generateResponseStructure(false, 'Series already exists', request.title, request.year, request.imdbId, request.tmdbId);
                logger.addContent('sonarr', { seriesName, seriesYear }, result, false);
                return result;
            }
    
            const response = await this.sendSeriesToSonarr(request);
    
            if (response.status === 201) {
                const result = this.generateResponseStructure(true, 'Series added', request.title, request.year, request.imdbId, request.tmdbId);
                logger.addContent('sonarr', { seriesName, seriesYear }, result, true);
                return result;
            }
    
            const errors = await response.json();
            const result = this.generateResponseStructure(false, 'Error adding series', request.title, request.year, request.imdbId, request.tmdbId, errors);
            logger.addContent('sonarr', { seriesName, seriesYear }, result, false);
            return result;

        } catch (error) {
            console.error('Error in add method:', error);
            const result = this.generateResponseStructure(false, 'Unexpected error occurred');
            logger.error('sonarr', `Error adding series: ${seriesName} (${seriesYear})`, error);
            return result;
        }
    }

    async bulkAdd(seriesList) {
        logger.log('info', 'sonarr', { message: `Attempting to add ${seriesList.length} series` });
        const results = seriesList.map(async (series) => {
            const result = await this.add(series.seriesName, series.seriesYear);
            return result;
        });

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
            languageProfileId: this.languageProfileId,
            qualityProfileId: this.qualityProfileId,
            path: path.normalize(path.join(this.rootFolder, normalizedFolder)),
            seasonFolder: true,
            monitored: true,
            minimumAvailability: 'released',
            addOptions: {
                monitor: "missing",
                searchForCutoffUnmetEpisodes: false,
                searchForMissingEpisodes: true
            }
        };
    }
    
    async sendSeriesToSonarr(request) {
        try {
            const url = `${this.sonarrUrl}/series`;
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(request),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-key': this.sonarrApiKey
                }
            });
            
            logger.log('api', 'sonarr', {
                operation: 'add-series',
                title: request.title,
                statusCode: response.status
            }, response.ok);
            
            return response;
        } catch (error) {
            logger.error('sonarr', `Error sending series to Sonarr: ${request.title}`, error);
            throw error;
        }
    }
}

export default SonarrController;