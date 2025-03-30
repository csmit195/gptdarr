# GPTDARR - Sonarr & Radarr MCP Server

## Description
GPTDARR is an AI tool server using Model Context Protocol (MCP) that integrates with Sonarr and Radarr. It helps AI assistants search, add, and manage TV shows and movies in your media library.

## Features
- Search for TV shows and movies across Sonarr and Radarr
- Add TV series to Sonarr
- Add movies to Radarr
- Comprehensive logging system for debugging and monitoring (sorry about the litter, this is very much a work in progress application)

## Current Limitations
- Works best with movies; TV show support is more limited
- Does not support individual season and episode file checks
- Monitoring toggles are not implemented (unmonitored items are ignored)

## Todo
- [ ] Implement individual season and episode file checks
- [ ] Add support for toggling monitoring status
- [ ] Improve TV show support to match movie functionality
- [ ] Override quality profile through natural language

## Getting Started

### Prerequisites
- Node.js 18 or higher
- Sonarr and Radarr set up and running
- An MCP-compatible chat client (e.g., 5ire, Claude)

### Installation & Setup
1. Run the interactive configuration wizard:
   ```bash
   npx gptdarr setup
   ```

2. The wizard will guide you through setting up:
   - Sonarr URL and API key
   - Radarr URL and API key
   - Quality profiles for both services
   - Root folders for media storage
   - Logging preferences

3. After completing the setup, the wizard will generate an NPX command (recommended). Copy this command.

4. In your MCP-compatible chat client (e.g., 5ire):
   - Go to Tools > New > Command
   - Paste the copied command
   - The chat client will now be able to start and communicate with the GPTDarr MCP server

The server provides the following tools:
- **lookup-content**: Search for TV shows and movies
  - Parameters:
    - `title`: The title to search for
    - `year` (optional): Release year to refine search
  
- **add-series**: Add TV series to Sonarr
  - Parameters:
    - `items`: List of TV series to add, each with:
      - `seriesName`: Name of the TV series
      - `seriesYear` (optional): Year of the TV series
  
- **add-movies**: Add movies to Radarr
  - Parameters:
    - `items`: List of movies to add, each with:
      - `title`: Title of the movie
      - `year` (optional): Year of the movie

### Logging
The logs are mostly for development, and we suggest disabling them when running setup.
- Content lookups
- Series and movie additions
- API requests and responses
- Errors and exceptions

Logs are stored in your home directory in a `.gptdarr` folder.

## Contributing
Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for more information.

## License
This project is licensed under the [MIT License](LICENSE).