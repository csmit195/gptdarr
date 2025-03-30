import { config } from './config.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import chalk from 'chalk';
import readlineSync from 'readline-sync';

//#region Helper Functions
const printHeader = (title) => {
    console.log('\n' + chalk.white('┌' + '─'.repeat(50) + '┐'));
    console.log(chalk.white('│') + chalk.cyan(title.padStart(25 + title.length/2).padEnd(50)) + chalk.white('│'));
    console.log(chalk.white('└' + '─'.repeat(50) + '┘\n'));
};

const printSection = (title) => {
    console.log(chalk.cyan('\n' + '═'.repeat(50)));
    console.log(chalk.cyan(title));
    console.log(chalk.cyan('═'.repeat(50) + '\n'));
};

const printSuccess = (message) => {
    console.log(chalk.green('✓ ' + message));
};

const printError = (message) => {
    console.log(chalk.red('✗ ' + message));
};

const printInfo = (message) => {
    console.log(chalk.blue('ℹ ' + message));
};

const printSeparator = () => {
    console.log('\n' + chalk.gray('─'.repeat(50)) + '\n');
};

const ask = (question, description, example, validator, defaultValue = null) => {
    let input;
    do {
        const prompt = description ? `${chalk.green(question)} (${chalk.yellow(description)})` : chalk.green(question);
        console.log(prompt);
        
        if (example || defaultValue) {
            const hints = [];
            if (example) hints.push(chalk.blue(`Example: ${example}`));
            if (defaultValue) hints.push(chalk.blue(`Default: ${defaultValue}`));
            console.log(hints.join(' | '));
        }
        
        input = readlineSync.question(chalk.magenta('> '));
        if (!input && defaultValue) {
            input = defaultValue;
        }
        if (validator && !validator(input)) {
            printError('Invalid input, please try again.');
        }
    } while (validator && !validator(input));
    printSeparator();
    return input;
};

const validateUrl = (url) => {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

const validateApiKey = (apiKey) => {
    return apiKey && apiKey.length > 0;
};

const validateApiConnection = async (url, apiKey) => {
    try {
        const response = await fetch(`${url}/api/v3/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-key': apiKey
            }
        });
        return response.status === 200;
    } catch (error) {
        printError(`Connection error: ${error.message}`);
        return false;
    }
};

const getRootFolders = async (url, apiKey) => {
    try {
        const response = await fetch(`${url}/api/v3/rootFolder`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-key': apiKey
            }
        });
        if (response.status !== 200) {
            throw new Error('Failed to fetch root folders');
        }
        return await response.json();
    } catch (error) {
        printError('Failed to fetch root folders: ' + error.message);
        return [];
    }
};

const getQualityProfiles = async (url, apiKey) => {
    try {
        const response = await fetch(`${url}/api/v3/qualityprofile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-key': apiKey
            }
        });
        if (response.status !== 200) {
            throw new Error('Failed to fetch quality profiles');
        }
        return await response.json();
    } catch (error) {
        printError('Failed to fetch quality profiles: ' + error.message);
        return [];
    }
};

const selectFromList = (items, prompt, formatter = (item) => item.name) => {
    if (items.length === 0) {
        printError('No items available to select from.');
        return null;
    }

    console.log(chalk.cyan(prompt));
    
    const options = items.map((item, index) => {
        const paddedIndex = String(index + 1).padStart(2);
        return `${chalk.cyan(paddedIndex)}. ${formatter(item)}`;
    });
    
    options.forEach(option => console.log(option));
    
    let selection;
    do {
        const input = readlineSync.question(chalk.yellow('\nSelect an option: '));
        if (input === '0' || input.toLowerCase() === 'cancel') {
            selection = -1;
            break;
        }
        selection = parseInt(input) - 1;
        if (isNaN(selection) || selection < 0 || selection >= items.length) {
            printError('Invalid selection. Please try again.');
        }
    } while (isNaN(selection) || selection < 0 || selection >= items.length);
    
    if (selection !== -1) {
        process.stdout.write('\x1b[1A\x1b[2K');
        printSuccess(`Selected: ${formatter(items[selection])}`);
    }
    
    printSeparator();
    return selection === -1 ? null : items[selection];
};

//#endregion

export async function generateConfig() {
    try {
        printHeader('GPTDARR Configuration Wizard');

        //#region Sonarr Configuration
        printSection('Sonarr Configuration');

        const sonarrUrl = ask(
            'Enter Sonarr URL',
            'The URL for your Sonarr server. Can be local or remote.',
            'http://localhost:8989',
            validateUrl,
            'http://localhost:8989'
        );

        const sonarrApiKey = ask(
            'Enter Sonarr API Key',
            'Your unique API key for Sonarr. You can find this in Sonarr Settings -> General -> Security -> API Key',
            null,
            validateApiKey
        );

        printInfo('Validating Sonarr connection...');
        const sonarrValid = await validateApiConnection(sonarrUrl, sonarrApiKey);
        if (!sonarrValid) {
            printError('Failed to connect to Sonarr. Please check your URL and API key.');
            return;
        }
        printSuccess('Successfully connected to Sonarr!');
        printSeparator();

        const sonarrRootFolders = await getRootFolders(sonarrUrl, sonarrApiKey);
        if (sonarrRootFolders.length === 0) {
            printError('No root folders found in Sonarr. Please add at least one root folder in Sonarr first.');
            return;
        }
        const selectedSonarrRoot = selectFromList(
            sonarrRootFolders,
            'Select a root folder for TV shows:',
            (folder) => `${folder.path} (${Math.round(folder.freeSpace / (1024 * 1024 * 1024))}GB free)`
        );
        if (!selectedSonarrRoot) {
            printError('No root folder selected. Exiting...');
            return;
        }

        const sonarrQualityProfiles = await getQualityProfiles(sonarrUrl, sonarrApiKey);
        if (sonarrQualityProfiles.length === 0) {
            printError('No quality profiles found in Sonarr. Please add at least one quality profile in Sonarr first.');
            return;
        }
        const selectedSonarrQuality = selectFromList(
            sonarrQualityProfiles,
            'Select a quality profile for TV shows:'
        );
        if (!selectedSonarrQuality) {
            printError('No quality profile selected. Exiting...');
            return;
        }

        //#endregion

        //#region Radarr Configuration
        printSection('Radarr Configuration');

        const radarrUrl = ask(
            'Enter Radarr URL',
            'The URL for your Radarr server. Can be local or remote.',
            'http://localhost:7878',
            validateUrl,
            'http://localhost:7878'
        );

        const radarrApiKey = ask(
            'Enter Radarr API Key',
            'Your unique API key for Radarr. You can find this in Radarr Settings -> General -> Security -> API Key',
            null,
            validateApiKey
        );

        printInfo('Validating Radarr connection...');
        const radarrValid = await validateApiConnection(radarrUrl, radarrApiKey);
        if (!radarrValid) {
            printError('Failed to connect to Radarr. Please check your URL and API key.');
            return;
        }
        printSuccess('Successfully connected to Radarr!');
        printSeparator();

        const radarrRootFolders = await getRootFolders(radarrUrl, radarrApiKey);
        if (radarrRootFolders.length === 0) {
            printError('No root folders found in Radarr. Please add at least one root folder in Radarr first.');
            return;
        }
        const selectedRadarrRoot = selectFromList(
            radarrRootFolders,
            'Select a root folder for movies:',
            (folder) => `${folder.path} (${Math.round(folder.freeSpace / (1024 * 1024 * 1024))}GB free)`
        );
        if (!selectedRadarrRoot) {
            printError('No root folder selected. Exiting...');
            return;
        }

        const radarrQualityProfiles = await getQualityProfiles(radarrUrl, radarrApiKey);
        if (radarrQualityProfiles.length === 0) {
            printError('No quality profiles found in Radarr. Please add at least one quality profile in Radarr first.');
            return;
        }
        const selectedRadarrQuality = selectFromList(
            radarrQualityProfiles,
            'Select a quality profile for movies:'
        );
        if (!selectedRadarrQuality) {
            printError('No quality profile selected. Exiting...');
            return;
        }

        //#endregion

        //#region Logging Configuration
        printSection('Logging Configuration');

        const enableLogging = readlineSync.keyInYN(
            chalk.yellow('Would you like to enable logging?'),
            { default: 'yes' }
        );

        //#endregion

        // Update config with gathered values
        config.set(['logging', 'enabled'], enableLogging);
        config.set(['sonarr', 'url'], sonarrUrl);
        config.set(['sonarr', 'apiKey'], sonarrApiKey);
        config.set(['sonarr', 'qualityProfileId'], selectedSonarrQuality.id);
        config.set(['sonarr', 'rootFolder'], selectedSonarrRoot.path);
        config.set(['radarr', 'url'], radarrUrl);
        config.set(['radarr', 'apiKey'], radarrApiKey);
        config.set(['radarr', 'qualityProfileId'], selectedRadarrQuality.id);
        config.set(['radarr', 'rootFolder'], selectedRadarrRoot.path);

        // Show configuration options
        printSection('Configuration Options');
        console.log(chalk.cyan('1. NPX Command:'));
        console.log(chalk.yellow(config.toNpxCommand()));
        printSeparator();
        
        console.log(chalk.cyan('2. Environment Variables:'));
        console.log(chalk.yellow(config.toEnvString()));
        printSeparator();
        
        console.log(chalk.cyan('3. MCP Format:'));
        console.log(chalk.yellow('* Unable to test this due to a bug on Windows, I highly suggest using 5ire instead of Claude Desktop for now.'));
        console.log(chalk.yellow(config.toMCPFormat()));
        printSeparator();

        printSuccess('Configuration generated successfully!');
        printInfo('You can use any of the above formats to configure GPTDarr.');
    } catch (error) {
        printError(`An unexpected error occurred: ${error.message}`);
        throw error;
    }
} 