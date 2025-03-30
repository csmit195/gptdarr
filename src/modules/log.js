import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const homePath = process.env.HOME || process.env.USERPROFILE; // HOME for Unix/Linux, USERPROFILE for Windows
const LOG_FILE = path.join(homePath, '.gptdarr', 'log.txt');

// Ensure log directory exists
try {
    fs.mkdirSync(path.join(homePath, '.gptdarr'), { recursive: true });
} catch (error) {
    console.error('Failed to create log directory:', error);
}

// Create logger function
const logger = {
  /**
   * Log a message to the log file
   * @param {string} type - The type of message (lookup, add, error)
   * @param {string} service - The service being used (sonarr, radarr, mcp)
   * @param {Object} data - The data associated with the message
   * @param {boolean} success - Whether the operation was successful
   */
  log(type, service, data, success = true) {
    if (!config.get(['logging', 'enabled'])) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      service,
      success,
      data
    };
    
    const logString = JSON.stringify(logEntry, null, 2);
    
    // Add a separator for readability
    const entry = `${logString}\n---\n`;
    
    // Append to log file
    fs.appendFileSync(LOG_FILE, entry);

    console.log(logString);
  },

  raw(data) {
    if (!config.get(['logging', 'enabled'])) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      data
    };

    const logString = JSON.stringify(logEntry, null, 2);
    fs.appendFileSync(LOG_FILE, logString);
    console.log(logString);
  },
  
  // Helper methods for specific log types
  lookupContent(service, query, results, success = true) {
    this.log('lookup', service, { query, results }, success);
  },
  
  addContent(service, items, results, success = true) {
    this.log('add', service, { items, results }, success);
  },
  
  error(service, message, error) {
    this.log('error', service, { message, error: error.message || String(error) }, false);
  }
};

// Create log file with header if it doesn't exist
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, `# GPTDarr MCP Server Log\nCreated: ${new Date().toISOString()}\n\n`);
}

export default logger; 