class Radarr {
    constructor() {}

    async lookup(movieName, movieYear) {
        try {
            const response = await fetch(`${process.env.RADARR_URL}/movie/lookup?term=${encodeURIComponent(movieName)}%20(${movieYear})`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-key': process.env.RADARR_API_KEY
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error in lookup method:', error);
            throw error;
        }
    }

    async add(movieName, movieYear) {
        try {
            const lookup = await this.lookup(movieName, movieYear);
    
            if (!lookup || lookup.length === 0) {
                return this.generateResponseStructure(false, 'No results found', movieName, movieYear);
            }
    
            const request = this.buildRequestObject(lookup[0]);
    
            if (typeof request.id !== 'undefined') {
                let msg = 'Movie already exists';
                if ( !request.hasFile && request.isAvailable && process.env.RADARR_FORCE_SEARCH_ON_EXISTING == 'true' ) {
                    msg = 'Movie already exists but is not downloaded, forcing a search for it and attempting to download it';
                    const url = `${process.env.RADARR_URL}/command`;
                    const postdata = {
                        "name":"MoviesSearch",
                        "movieIds":[request.id]
                    };
                    console.log('Sending post request to:', url);
                    console.log('Post data:', postdata);
                    const response = await fetch(url, {
                        method: 'POST',
                        body: JSON.stringify(postdata),
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Api-key': process.env.RADARR_API_KEY
                        }
                    });
                }

                return this.generateResponseStructure(false, msg, request.title, request.year, request.imdbId, request.tmdbId);
            }
    
            const response = await this.sendMovieToRadarr(request);
    
            if (response.status === 201) {
                return this.generateResponseStructure(true, 'Movie added', request.title, request.year, request.imdbId, request.tmdbId);
            }
    
            const errors = await response.json();
            return this.generateResponseStructure(false, 'Error adding movie', request.title, request.year, request.imdbId, request.tmdbId, errors);
    
        } catch (error) {
            console.error('Error in add method:', error);
            return this.generateResponseStructure(false, 'Unexpected error occurred');
        }
    }

    async bulkAdd(movieList) {
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
        return {
            ...lookupResult,
            qualityProfileId: 3,
            profileId: 3,
            path: `/mnt/Movies/${lookupResult.folder}`,
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
        console.log('Sending movie to Radarr:', request.title);
        const url = `${process.env.RADARR_URL}/movie`;
        return fetch(url, {
            method: 'POST',
            body: JSON.stringify(request),
            headers: {
                'Content-Type': 'application/json',
                'X-Api-key': process.env.RADARR_API_KEY
            }
        });
    }
}

export default new Radarr();