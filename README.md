# GPTDARR

## Description
GPTDARR is an innovative tool designed to integrate ChatGPT's advanced capabilities with Sonarr and Radarr. It assists in adding, monitoring, and obtaining detailed information about TV shows and movies, streamlining your media management experience.

## Features
- Easy integration with Sonarr and Radarr
- AI-driven insights for media management
- Automated addition and tracking of TV shows and movies
- Simplified user interface for media library management

## Getting Started

### Prerequisites
- Node.js
- Sonarr and Radarr set up and running
- Basic knowledge of .env configurations

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/GPTDARR.git
   ```
2. Navigate to the cloned directory:
   ```
   cd GPTDARR
   ```
3. Install dependencies:
   ```
   npm install
   ```

### Configuration
Run the configuration script:
```
node config.js
```
This will generate a `.env` file for your environment variables.

Alternatively, you can rename `.env.example` to `.env` and edit it manually.

### Usage
- For setting up the GPT, please follow the [GPT Setup Guide](GTP_SETUP.md).
- Start the application:
  ```
  node app.js
  ```
- You can use PM2 or Linux Services to create an auto startup for the script.
- Follow the prompts to manage your Sonarr and Radarr libraries with the help of ChatGPT.

## Note
Currently, the tool does not support language profiles but allows setting quality profiles for downloads.

## Contributing
Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for more information.

## License
This project is licensed under the [MIT License](LICENSE).