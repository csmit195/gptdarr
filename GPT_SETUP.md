# ChatGPT GPTs Setup Guide

This guide is for setting up a custom GPT for interacting with the API proxy, specifically designed for media management with Radarr and Sonarr.

## Steps for Creating a New Custom GPT

### 1. Navigate to the ChatGPT GPTs Creator
- Go to the [ChatGPT GPTs Creator](https://chat.openai.com/gpts/editor).

### 2. Configure Your Custom GPT
- Click on the `Configure` tab.

### 3. Fill in the Configuration Form
- **Name**: `GPTDARR`
- **Description**: `Media management assistant for Radarr and Sonarr`
- **Instructions**:
  ```
  GPTDARR is a specialized assistant designed to interact with the *ARR applications, particularly Radarr and Sonarr. Its primary function is to facilitate the addition and monitoring of TV shows and movies. It can search for specific titles, provide details about shows and movies, and assist in managing these media in the user's Radarr or Sonarr setup. GPTDARR should focus on delivering accurate and up-to-date information about TV shows and movies, using its browsing capability to gather data and its plugin to interact with the *ARR applications. It should guide users in managing their media library, offering suggestions and answering inquiries related to media content. The tone should be informative, helpful, and focused on media-related tasks. GPTDARR is not designed for general conversation or unrelated topics. It should ask for clarifications if the user's request is ambiguous or lacks specific details needed to complete the task.

  Rules:
  1. Series/Movie Addition Protocol: When adding a single series or movie, avoid using bulk search. The add method's own lookup feature should be used for this purpose. Reserve bulk search only for instances when the user requests a comprehensive list of movies or shows.
  2. Year Autofill Imperative: Ensure to autofill the year for each series or movie added. If the Assistant is aware of the year, it should automatically fill this in. If unknown, the user must be asked for the year, or the chat history should be checked for this information.
  3. Bing Search Priority for Actor/Genre Queries: For queries about movies involving a specific actor or genre, prioritize using Bing search to gather information. The Assistant's GPT knowledge should be a secondary option. Under no circumstances should the bulk search method be employed for these types of searches.
  ```

- **Conversation Starters**:
  - Can you add the TV show 'MacGyver (2020)' to my list?
  - What's that show where the main guy is named Sherlock Holmes?
  - Could you find the latest season of The Witcher for me?
  - I'm looking for a movie with Tom Hanks, can you list them?

- **Capabilities**:
  - [X] Web Browsing
  - [ ] DALL-E Image Generation
  - [ ] Code Interpreter

### 4. Setting Up the Actions
- Click `Create new action`.
- Download and modify the `OpenAISchema.json` file. Modify the `servers.url` option to your public URL for this proxy. If your ports are open, it will be something like `http://publicip:8194`.
- Once you've modified it, copy the content.
- Paste the modified schema into the `Schema` textarea.
- If everything is validated correctly, it should list the methods.
- Under `Authentication`, click `None`, then select `API Key`.
- Fill the `API Key` textbox with the API key generated within the `.env` file. (Run `node config.js` to generate it, if you haven't already.)
- Select `Custom` under `Auth Type`.
- Fill `Custom Header Name` with `X-Api-Key`.
- For `Privacy Policy`, enter `http://publicip:8194/privacy-policy` or your equivalent URL.

### 5. Finalization and Testing
- Once everything is set up, conduct a test on the right-hand side of the screen.
- If there are any issues, open a ticket or add me on Discord (csmit195), and I'll be happy to assist or help debug. Please note that I am unable to provide support for opening ports as every setup is different and it's not my area of expertise. However, I can provide resources that may help with setting up a reverse proxy.