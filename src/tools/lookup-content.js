import { z } from "zod";
import logger from '../modules/log.js';
import SonarrController from '../modules/sonarr.js';
import RadarrController from '../modules/radarr.js';
import { cleanObject } from '../modules/utils.js';

export const schema = {
    title: z.string().describe("The movie or series title to search for"),
    year: z.string().optional().describe("Release year to refine search (optional)")
};

export async function handler({ title, year = "" }) {
    if (!title) {
        logger.error('mcp', 'Title is required for search', new Error('Missing title parameter'));
        return {
            content: [
                {
                    type: "text",
                    text: "Title is required for search"
                }
            ]
        };
    }

    try {
        const sonarr = new SonarrController();
        const radarr = new RadarrController();
        const promises = [
            sonarr.lookup(title, year),
            radarr.lookup(title, year)
        ];

        const results = await Promise.all(promises);
        
        const cleanedShows = results[0].map(cleanObject);
        const cleanedMovies = results[1].map(cleanObject);

        // Log the successful lookup
        logger.lookupContent('mcp', { title, year }, { 
            shows: cleanedShows.length, 
            movies: cleanedMovies.length 
        });

        return {
            content: [
                {
                    type: "text",
                    text: `Found ${cleanedShows.length} TV shows and ${cleanedMovies.length} movies matching "${title}${year ? ` (${year})` : ''}"`,
                },
                {
                    type: "text",
                    text: JSON.stringify({
                        shows: cleanedShows,
                        movies: cleanedMovies
                    })
                }
            ]
        };
    } catch (error) {
        console.error("Error in lookup-content:", error);
        logger.error('mcp', 'Error searching for content', error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error searching for content: ${error.message}`
                }
            ]
        };
    }
} 