import fs from 'node:fs';

class Sonarr {
    constructor() {}

    async lookup(seriesName, seriesYear) {
        const response = await fetch(`${process.env.SONARR_URL}/series/lookup?term=${seriesName}%20(${seriesYear})`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-key': process.env.SONARR_API_KEY
            }
        });
        return await response.json();
    }

    async add(seriesName, seriesYear) {
        try {
            const lookup = await this.lookup(seriesName, seriesYear);
    
            if (!lookup || lookup.length === 0) {
                return this.generateResponseStructure(false, 'No results found', seriesName, seriesYear);
            }
    
            const request = {
                ...lookup[0],
                languageProfileId: 1,
                qualityProfileId: 3,
                path: `/mnt/TV_Shows/${lookup[0].folder}`,
                seasonFolder: true,
                monitored: true,
                minimumAvailability: 'released',
                addOptions: {
                    monitor: "missing",
                    searchForCutoffUnmetEpisodes: false,
                    searchForMissingEpisodes: true
                }
            };
    
            if (typeof request.id !== 'undefined') {
                return this.generateResponseStructure(false, 'Series already exists', request.title, request.year, request.imdbId, request.tmdbId);
            }
    
            const response = await this.sendSeriesToSonarr(request);
    
            if (response.status === 201) {
                return this.generateResponseStructure(true, 'Series added', request.title, request.year, request.imdbId, request.tmdbId);
            }
    
            const errors = await response.json();
            return this.generateResponseStructure(false, 'Error adding series', request.title, request.year, request.imdbId, request.tmdbId, errors);

        } catch (error) {
            console.error('Error in add method:', error);
            return this.generateResponseStructure(false, 'Unexpected error occurred');
        }
    }

    async bulkAdd(seriesList) {
        // let results = [];
        // for ( const series of seriesList ) {
        //     const result = await this.add(series.seriesName, series.seriesYear);
        //     results.push(result);
        // }
        // rewrite as a .map() (do not use promise.all())
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
    
    async sendSeriesToSonarr(request) {
        const url = `${process.env.SONARR_URL}/series`;
        return fetch(url, {
            method: 'POST',
            body: JSON.stringify(request),
            headers: {
                'Content-Type': 'application/json',
                'X-Api-key': process.env.SONARR_API_KEY
            }
        });
    }
}

export default new Sonarr();