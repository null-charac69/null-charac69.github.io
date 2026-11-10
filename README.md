# Anant Kumar Thakur — Portfolio

Personal engineering portfolio for Anant Kumar Thakur, AI/ML and Generative AI Engineer.

Live site: https://null-charac69.github.io/

## Source structure

    .
    ├── _config.yml
    ├── _includes/
    │   ├── sections/
    │   ├── chat-widget.html
    │   ├── head.html
    │   └── site-header.html / site-footer.html
    ├── _layouts/default.html
    ├── assets/
    │   ├── css/
    │   └── js/modules/
    ├── bedrock-api/
    │   ├── api/index.py
    │   ├── core.py
    │   ├── pyproject.toml
    │   └── vercel.json
    └── index.html

## Architecture

    Browser
      ├── GitHub Pages + Jekyll (portfolio frontend)
      └── POST /chat
            └── Vercel Python Function
                  └── Amazon Bedrock Converse API
                        └── global.moonshotai.kimi-k3.1

The Vercel API uses server-side AWS credentials from encrypted environment variables. No AWS credentials or model-provider keys are included in frontend code. The API is deployed separately from the static GitHub Pages site.

## Features

- Responsive editorial portfolio with paper/ink/cobalt light theme and matching navy dark theme.
- Accessible mobile navigation, theme preference, reading progress and reduced-motion support.
- Project filters and expandable architecture/design notes.
- Dynamic public GitHub repository list with search and repository metadata.
- Portfolio assistant powered by Kimi K3.1 on Amazon Bedrock.
- Browser-local chat history; the API does not persist conversation content.

## Chat API

The API is hosted at:

- Health: https://anant-portfolio-bedrock-api.vercel.app/health
- Chat: https://anant-portfolio-bedrock-api.vercel.app/chat

The Bedrock model is `global.moonshotai.kimi-k3.1` in `ap-southeast-2`. AWS access key credentials must be configured as encrypted Vercel Production environment variables before inference can run. See DEPLOYMENT.md.

## Run the frontend locally

    bundle install
    bundle exec jekyll serve

## Project sources

- AgentOS: https://github.com/null-charac69/agentos
- Hybrid RAG Pipeline: https://github.com/null-charac69/hrag-app
- Healthcare Analytics: https://github.com/null-charac69/healthcare_analytics

Project descriptions are grounded in public repository documentation. Unsupported performance figures are not presented as verified results.

## Operational notes

- Chat is a public API. CORS restricts browser access to the portfolio origin but is not authentication.
- Bedrock inference is metered. Review AWS Bedrock pricing and configure an AWS Budget before public launch.
- Conversation history is stored in the visitor's browser localStorage and included in each chat request. The backend does not persist it.
- Do not invite visitors to submit credentials or sensitive information.
- A former Gemini key was committed to the public repository. Revoke it; removing the file does not remove it from Git history.
