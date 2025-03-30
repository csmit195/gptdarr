import { z } from "zod";
import logger from '../modules/log.js';
import RadarrController from '../modules/radarr.js';

export const schema = {
    items: z.array(
        z.object({
            title: z.string().describe("Title of the movie"),
            year: z.string().optional().describe("Year of the movie (optional)")
        })
    ).describe("List of movies to add")
};

export async function handler({ items }) {
    console.log("this is a test")
    if (!items || items.length === 0) {
        logger.error('radarr', 'No movies provided to add', new Error('Empty movie list'));
        return {
            content: [
                {
                    type: "text",
                    text: "No movies provided to add"
                }
            ]
        };
    }

    try {
        const radarr = new RadarrController();
        const results = await radarr.bulkAdd(items);

        const successCount = results.filter(result => result.success).length;
        logger.addContent('radarr', items, { 
            total: items.length, 
            successful: successCount,
            failed: items.length - successCount
        });

        return {
            content: [
                {
                    type: "text",
                    text: `Attempted to add ${items.length} movies to Radarr`
                },
                {
                    type: "text",
                    text: JSON.stringify(results)
                }
            ]
        };
    } catch (error) {
        console.error("Error in add-movies:", error);
        logger.error('radarr', 'Error adding movies', error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error adding movies: ${error.message}`
                }
            ]
        };
    }
} 