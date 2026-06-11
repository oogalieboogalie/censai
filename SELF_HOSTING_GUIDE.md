# Censai Self-Hosting Guide

Welcome to Censai! This guide will walk you through the process of setting up and running your own instance of the Censai platform.

## Prerequisites

1.  **Docker:** You will need Docker and Docker Compose to run the required backend services (PostgreSQL, Qdrant).
2.  **Node.js:** The application server and frontend are powered by Node.js.
3.  **An AI Provider:** By default, Censai is configured to work with a local Ollama-compatible API endpoint. You can install [Ollama](https://ollama.com/) to get started quickly.

## Step 1: Clone the Repository

First, clone the Censai repository to your local machine:

```bash
git clone https://github.com/censai-systems/censai.git
cd censai
```

## Step 2: Configure Your Environment

Censai is configured using environment variables.

1.  **Create a `.env` file:** Copy the example file to a new `.env` file in the root of the project.
    ```bash
    cp .env.example .env
    ```

2.  **Edit the `.env` file:** Open the `.env` file in a text editor and fill in the required values.

    ### Core Configuration (Required)

    *   `DATABASE_URL`: The connection string for the PostgreSQL database. The default `postgresql://censai:censai@127.0.0.1:5433/censai` is pre-configured for the included Docker Compose setup. **You should not need to change this.**
    *   `QDRANT_URL`: The URL for the Qdrant vector database. The default `http://127.0.0.1:6335` is also configured for Docker. **You should not need to change this.**
    *   `APP_ORIGIN`: The URL where the frontend application will be running. The default is `http://localhost:5173`.

    ### Security Secrets (Required)

    Censai uses two secrets to protect session data and encrypted agent journals. **You must set these before the server will start.** Generate each one with the command below and paste the output into your `.env` file.

    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```

    *   `SESSION_SECRET`: Signs the HTTP session cookie. Required in all deployments; in local dev a random value is generated automatically.
    *   `JOURNAL_SECRET`: Encrypts agent journal entries with AES-256-GCM. Each installation must have its own unique key — the server will refuse to start without it.

    ### AI Provider Configuration

    Censai needs to connect to a Large Language Model (LLM). The easiest way to get started is with a local model via Ollama.

    *   `AI_BASE_URL`: The base URL of your AI provider's API. For a local Ollama instance, this is `http://localhost:11434/v1`.
    *   `AI_API_KEY`: The API key for your provider. For Ollama, the default value is `ollama`.
    *   `AI_MODEL`: The name of the model you want to use. Pick one that supports function calling (e.g., `qwen3-coder:latest`).

    ### Optional: Connecting to Other Services

    You can add API keys for other services to unlock more features:

    *   `GEMINI_API_KEY`: For Google Gemini models and image generation.
    *   `OPENROUTER_API_KEY`: For models from OpenRouter.
    *   `YOUTUBE_API_KEY`: To enable the YouTube search tool.
    *   `G_CLIENT_ID` / `G_SECRET`: Google OAuth2 credentials for Calendar and Sheets integration. Create a Web Application OAuth2 client at [console.cloud.google.com](https://console.cloud.google.com), enable the **Google Calendar API** and **Google Sheets API**, and add `http://localhost:3001/api/auth/google/callback` (or your production URL) as an authorised redirect URI.

## Step 3: Start the Backend Services

In a terminal, run the following command from the root of the project to start the PostgreSQL and Qdrant databases using Docker:

```bash
docker compose up -d
```

This will download the necessary images and start the containers in the background.

## Step 4: Install Dependencies and Run the Application

1.  **Install project dependencies:**
    ```bash
    npm install
    ```

2.  **Start the application:**
    ```bash
    npm run dev
    ```

This command starts both the backend server (on port 3001) and the frontend development server (on port 5173) concurrently.

You should now be able to access Censai in your browser at `http://localhost:5173`!
