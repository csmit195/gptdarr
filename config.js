import fs from 'fs';
import readlineSync from 'readline-sync';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';

//#region Helper Functions
const ask = (question, description, example, validator) => {
    let input;
    do {
        console.log(chalk.green(question));
        console.log(chalk.yellow(description));
        if (example) {
            console.log(chalk.blue(`Example: ${example}`));
        }
        input = readlineSync.question(chalk.magenta('> '));
        if (validator && !validator(input)) {
            console.log(chalk.red('Invalid input, please try again.'));
        }
    } while (validator && !validator(input));
    return input;
};

const validateUrl = (url) => {
    const regex = /^(http|https):\/\/[^ "]+$/;
    return regex.test(url);
};

const validateSonarrApiKey = (apiKey) => {
    // TODO: Validate API key

    return true;
}

const validateRadarrApiKey = (apiKey) => {
    // TODO: Validate API key
    return true;
}

function mergeUrls(...urls) {
    let fullUrl = new URL(urls[0]);

    let additionalPaths = urls.slice(1).map(path => path.replace(/^\//, '')).join('/');
    fullUrl.pathname += (fullUrl.pathname.endsWith('/') ? '' : '/') + additionalPaths;

    return fullUrl.href;
}
//#endregion

console.log(chalk.white('------------------------'));
console.log(chalk.cyan(' GPTDARR'));
console.log(chalk.cyan(' DotEnv Configuration'));
console.log(chalk.white('------------------------'));

//#region Sonarr
const sonarrUrl = mergeUrls(ask(
    'Enter SONARR URL',
    'The URL for your Sonarr server. Can be local or remote.',
    'http://192.168.1.238:8989/sonarr',
    validateUrl
), 'api/v3');

const sonarrApiKey = ask('Enter SONARR API Key', 'Your unique API key for Sonarr.', null, validateSonarrApiKey);

//#region Sonarr Quality Profile
const sonarrQResponse = await fetch(`${sonarrUrl}/qualityprofile`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'X-Api-key': sonarrApiKey
    }
});

if (sonarrQResponse.status == 401) {
    console.log(chalk.red('Invalid API key, please try again.'));
    process.exit();
}

if (sonarrQResponse.status != 200) {
    console.log(chalk.red('Unexpected error occurred, please try again.'));
    process.exit();
}

const sonarrQualityProfiles = await sonarrQResponse.json();

const sonarrQualityProfilesNames = sonarrQualityProfiles.map((profile, index) => {
    return `${index + 1}: ${profile.name}`;
});

const sonarrQualityProfileIndex = readlineSync.keyInSelect(sonarrQualityProfilesNames, 'Select a quality profile for your series:');
const sonarrQualityProfileId = sonarrQualityProfiles[sonarrQualityProfileIndex].id;
console.log(chalk.green(`Selected quality profile: ${sonarrQualityProfiles[sonarrQualityProfileIndex].name}`));
//#endregion

//#region Sonarr Language Profile
// http://192.168.1.238:8989/sonarr/api/v3/languageprofile
const sonarrLanguageProfilesResponse = await fetch(`${sonarrUrl}/languageprofile`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'X-Api-key': sonarrApiKey
    }
});

// No need for API key validation here, it was already validated above

if (sonarrLanguageProfilesResponse.status != 200) {
    console.log(chalk.red('Unexpected error occurred, please try again.'));
    process.exit();
}

const sonarrLanguageProfiles = await sonarrLanguageProfilesResponse.json();

const sonarrLanguageProfilesNames = sonarrLanguageProfiles.map((profile, index) => {
    return `${index + 1}: ${profile.name}`;
});

const sonarrLlanguageProfileIndex = readlineSync.keyInSelect(sonarrLanguageProfilesNames, 'Select a language profile for your series:');
const sonarrLanguageProfileId = sonarrLanguageProfiles[sonarrLlanguageProfileIndex].id;
console.log(chalk.green(`Selected language profile: ${sonarrLanguageProfiles[sonarrLlanguageProfileIndex].name}`));

//#endregion

//#endregion

//#region Radarr
const radarrUrl = mergeUrls(ask(
    'Enter RADARR URL',
    'The URL for your Radarr server. Can be local or remote.',
    'http://192.168.1.238:7878/radarr',
    validateUrl
), 'api/v3');

const radarrApiKey = ask('Enter RADARR API Key', 'Your unique API key for Radarr.', null, validateRadarrApiKey);

// RADARR_FORCE_SEARCH_ON_EXISTING (search radarr if already existing, but not downloaded)
const radarrForceSearchOnExisting = readlineSync.keyInYN('Force search for existing, but missing movies?') ? 'true' : 'false';

// #region Radarr Quality Profile
const radarrQResponse = await fetch(`${radarrUrl}/qualityprofile`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'X-Api-key': radarrApiKey
    }
});

if (radarrQResponse.status == 401) {
    console.log(chalk.red('Invalid API key, please try again.'));
    process.exit();
}

if (radarrQResponse.status != 200) {
    console.log(chalk.red('Unexpected error occurred, please try again.'));
    process.exit();
}

const radarrQualityProfiles = await radarrQResponse.json();
const radarrQualityProfilesNames = radarrQualityProfiles.map((profile, index) => {
    return `${index + 1}: ${profile.name}`;
});
const radarrQualityProfileIndex = readlineSync.keyInSelect(radarrQualityProfilesNames, 'Select a quality profile for your movies:');
const radarrQualityProfileId = radarrQualityProfiles[radarrQualityProfileIndex].id;
console.log(chalk.green(`Selected quality profile: ${radarrQualityProfiles[radarrQualityProfileIndex].name}`));
// #endregion

// How the hell do language profiles work for radarr, TODO: reverse engineer this soon

//#endregion

//#region Security
console.log(chalk.yellow('Security Settings'));
const onlyAllowOpenAI = readlineSync.keyInYN('Only allow OpenAI?') ? 'true' : 'false';
const proxyApiKey = uuidv4();
//#endregion


// Building .env content
const envContent = `
[SONARR]
SONARR_URL=${sonarrUrl}
SONARR_QUALITY_PROFILE_ID=${sonarrQualityProfileId}
SONARR_LANGUAGE_PROFILE_ID=${sonarrLanguageProfileId}
SONARR_API_KEY=${sonarrApiKey}

[RADARR]
RADARR_URL=${radarrUrl}
RADARR_API_KEY=${radarrApiKey}
RADARR_QUALITY_PROFILE_ID=${radarrQualityProfileId}
RADARR_FORCE_SEARCH_ON_EXISTING=${radarrForceSearchOnExisting}

[SECURITY]
ONLY_ALLOW_OPENAI=${onlyAllowOpenAI}
PROXY_API_KEY=${proxyApiKey}
`;

// Writing to .env file
fs.writeFileSync('.env', envContent.trim());
console.log(chalk.green('Configuration saved to .env file.'));
console.log(chalk.green(`Your PROXY_API_KEY is: ${proxyApiKey}, it can be found in the .env file.`));