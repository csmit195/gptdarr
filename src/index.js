#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import chalk from 'chalk';
import { Command } from 'commander';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';

import { config } from './config/config.js';
import { generateConfig } from './config/generator.js';
import logger from './modules/log.js';

// Create MCP server instance at root level
const server = new McpServer({
    name: "gptdarr",
    version: "1.0.0",
});

// Redirect stdio to log file
const homePath = process.env.HOME || process.env.USERPROFILE;
const LOG_FILE = join(homePath, '.gptdarr', 'log.txt');
const logStream = createWriteStream(LOG_FILE, { flags: 'a' });

// Store original stdio
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;

// Override stdout
process.stdout.write = function(chunk, encoding, callback) {
    originalStdout.call(this, chunk, encoding, callback);
    logStream.write(chunk);
};

// Override stderr
process.stderr.write = function(chunk, encoding, callback) {
    originalStderr.call(this, chunk, encoding, callback);
    logStream.write(chunk);
};

// Initialize transport at top level
const transport = new StdioServerTransport();

async function registerTools() {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    const toolsDir = join(scriptDir, 'tools');
    
    try {
        const files = await readdir(toolsDir);
        const toolFiles = files.filter(file => file.endsWith('.js') && file !== 'index.js' && !file.endsWith('.disabled.js'));
        
        // Import and register each tool
        await Promise.all(toolFiles.map(async file => {
            const toolName = file.replace('.js', '');
            const toolPath = `./tools/${file}`;
            
            try {
                const { schema, handler } = await import(toolPath);
                logger.raw(schema);
                server.tool(toolName, schema, handler);
                logger.log('info', 'mcp', { message: `Registered tool: ${toolName}` });
            } catch (error) {
                logger.error('mcp', `Failed to register tool ${toolName}`, error);
                console.error(chalk.red(`Failed to register tool ${toolName}:`), error);
                throw error; // Re-throw to handle in the main function
            }
        }));
    } catch (error) {
        logger.error('mcp', 'Failed to load tools', error);
        throw error;
    }
}

async function main() {
    const program = new Command();

    program
        .name('gptdarr')
        .description('CLI tool for managing Sonarr and Radarr using GPT')
        .version('1.0.0');

    program
        .command('setup')
        .description('Run the interactive configuration wizard')
        .action(async () => {
            try {
                await generateConfig();
                process.exit(0);
            } catch (error) {
                console.error(chalk.red('❌ Error during setup:'), error);
                process.exit(1);
            }
        });

    program
        .option('--enable_logging <value>', 'Enable or disable logging', 'true')
        .option('--sonarr_url <url>', 'Sonarr server URL')
        .option('--sonarr_api_key <key>', 'Sonarr API key')
        .option('--sonarr_quality_profile_id <id>', 'Sonarr quality profile ID')
        .option('--sonarr_root_folder <path>', 'Sonarr root folder path')
        .option('--radarr_url <url>', 'Radarr server URL')
        .option('--radarr_api_key <key>', 'Radarr API key')
        .option('--radarr_quality_profile_id <id>', 'Radarr quality profile ID')
        .option('--radarr_root_folder <path>', 'Radarr root folder path')
        .option('--radarr_force_search_on_existing <value>', 'Force search on existing movies', 'true')
        .action(async (options) => {
            options.enableLogging = options.enable_logging === 'true';
            options.radarrForceSearchOnExisting = options.radarr_force_search_on_existing === 'true';

            config.loadFromArgs(options);
            config.validateRequired();

            try {
                // Register all tools first
                await registerTools();
                
                // Connect server only after all tools are registered
                await server.connect(transport);
                
                // clear the console
                console.clear();
                console.log('GPTDarr MCP Server running on stdio');
                
                logger.log('info', 'mcp', { message: 'Server started successfully' });
            } catch (error) {
                console.error("Fatal error in MCP server:", error);
                logger.error('mcp', 'Fatal error in MCP server', error);
                process.exit(1);
            }
        });

    await program.parseAsync(process.argv);
}

// Start the application
main().catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
});