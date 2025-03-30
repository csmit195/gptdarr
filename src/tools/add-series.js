import { z } from "zod";
import logger from '../modules/log.js';
import SonarrController from '../modules/sonarr.js';

export const schema = {
    items: z.array(
        z.object({
            seriesName: z.string().describe("Name of the TV series"),
            seriesYear: z.string().optional().describe("Year of the TV series (very preferred, but not required)")
        })
    ).describe("List of TV series to add")
};

export async function handler({ items }) {
    if (!items || items.length === 0) {
        logger.error('sonarr', 'No series provided to add', new Error('Empty series list'));
        return {
            content: [
                {
                    type: "text",
                    text: "No series provided to add"
                }
            ]
        };
    }

    try {
        const sonarr = new SonarrController();
        const results = await sonarr.bulkAdd(items);
        const resolvedResults = await Promise.all(results);
        
        logger.raw(resolvedResults);

        const successCount = resolvedResults.filter(result => result.success).length;
        logger.addContent('sonarr', items, { 
            total: items.length, 
            successful: successCount,
            failed: items.length - successCount
        });

        return {
            content: [
                {
                    type: "text",
                    text: `Attempted to add ${items.length} series to Sonarr`
                },
                {
                    type: "text",
                    text: JSON.stringify(resolvedResults)
                }
            ]
        };
    } catch (error) {
        console.error("Error in add-series:", error);
        logger.error('sonarr', 'Error adding series', error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error adding series: ${error.message}`
                }
            ]
        };
    }
} 