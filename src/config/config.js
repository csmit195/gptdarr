import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

// Required configuration paths
const REQUIRED_CONFIG = [
  ['sonarr', 'url'],
  ['sonarr', 'apiKey'],
  ['sonarr', 'rootFolder'],
  ['radarr', 'url'],
  ['radarr', 'apiKey'],
  ['radarr', 'rootFolder']
];

// Default configuration values
const DEFAULT_CONFIG = {
  logging: {
    enabled: true,
    logPath: join(homedir(), '.gptdarr', 'log.txt')
  },
  sonarr: {
    url: 'http://localhost:8989',
    apiKey: '',
    qualityProfileId: 3,
    rootFolder: ''
  },
  radarr: {
    url: 'http://localhost:7878',
    apiKey: '',
    qualityProfileId: 3,
    rootFolder: '',
    forceSearchOnExisting: true
  }
};

// Environment variable mapping
const ENV_MAPPING = {
  ENABLE_LOGGING: ['logging', 'enabled'],
  SONARR_URL: ['sonarr', 'url'],
  SONARR_API_KEY: ['sonarr', 'apiKey'],
  SONARR_QUALITY_PROFILE_ID: ['sonarr', 'qualityProfileId'],
  SONARR_ROOT_FOLDER: ['sonarr', 'rootFolder'],
  RADARR_URL: ['radarr', 'url'],
  RADARR_API_KEY: ['radarr', 'apiKey'],
  RADARR_QUALITY_PROFILE_ID: ['radarr', 'qualityProfileId'],
  RADARR_ROOT_FOLDER: ['radarr', 'rootFolder'],
  RADARR_FORCE_SEARCH_ON_EXISTING: ['radarr', 'forceSearchOnExisting']
};

class Config {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadFromEnv();
  }

  loadFromEnv() {
    for (const [envKey, path] of Object.entries(ENV_MAPPING)) {
      const value = process.env[envKey];
      if (value !== undefined) {
        this.set(path, this.parseValue(value));
      }
    }
  }

  loadFromArgs(args) {
    for (const [envKey, path] of Object.entries(ENV_MAPPING)) {
      const argKey = envKey.toLowerCase();
      if (args[argKey] !== undefined) {
        this.set(path, this.parseValue(args[argKey]));
      }
    }
  }

  set(path, value) {
    let current = this.config;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
  }

  parseValue(value) {
    if (value === 'true' || value === 'false') {
      return value === 'true';
    }
    if (!isNaN(value)) {
      return Number(value);
    }
    return value;
  }

  get(path) {
    let current = this.config;
    for (const key of path) {
      current = current[key];
    }
    return current;
  }

  validateRequired() {
    const missing = [];
    for (const path of REQUIRED_CONFIG) {
      const value = this.get(path);
      if (!value) {
        const envKey = Object.entries(ENV_MAPPING).find(([_, p]) => 
          p[0] === path[0] && p[1] === path[1]
        )?.[0];
        missing.push({
          path: path.join('.'),
          envKey: envKey || path.join('_').toUpperCase()
        });
      }
    }

    if (missing.length > 0) {
      console.error(chalk.red('\n❌ Missing required configuration:'));
      missing.forEach(({ path, envKey }) => {
        console.error(chalk.yellow(`  • ${path} (${envKey})`));
      });
      console.error(chalk.blue('\nPlease run:'));
      console.error(chalk.cyan('  npx gptdarr setup'));
      console.error(chalk.blue('\nOr provide the values via environment variables or command line arguments.'));
      process.exit(1);
    }
  }

  toEnvString() {
    let output = '';
    for (const [envKey, path] of Object.entries(ENV_MAPPING)) {
      const value = this.get(path);
      if (value !== undefined && value !== '') {
        output += `${envKey}=${value}\n`;
      }
    }
    return output.trim();
  }

  toNpxCommand() {
    const args = [];
    for (const [envKey, path] of Object.entries(ENV_MAPPING)) {
      const value = this.get(path);
      if (value !== undefined && value !== '') {
        const key = envKey.toLowerCase();
        let formattedValue = value;

        // Handle different value types
        if (typeof value === 'string') {
          // Quote string values, especially if they contain spaces or special characters
          if (value.includes(' ') || value.includes('\\') || value.includes('"')) {
            formattedValue = `"${value.replace(/"/g, '\\"')}"`;
          }
        } else if (typeof value === 'boolean') {
          formattedValue = value.toString();
        }

        args.push(`--${key}=${formattedValue}`);
      }
    }
    return `npx gptdarr ${args.join(' ')}`;
  }

  toMCPFormat() {
    const args = [];
    for (const [envKey, path] of Object.entries(ENV_MAPPING)) {
      const value = this.get(path);
      if (value !== undefined && value !== '') {
        const key = envKey.toLowerCase();
        let formattedValue = value;

        // Handle different value types
        if (typeof value === 'string') {
          // Quote string values, especially if they contain spaces or special characters
          if (value.includes(' ') || value.includes('\\') || value.includes('"')) {
            formattedValue = `"${value.replace(/"/g, '\\"')}"`;
          }
        } else if (typeof value === 'boolean') {
          formattedValue = value.toString();
        }

        args.push(`--${key}=${formattedValue}`);
      }
    }

    return JSON.stringify({
      mcpServers: {
        gptdarr: {
          command: "npx gptdarr",
          args: args
        }
      }
    }, null, 2);
  }
}

export const config = new Config(); 