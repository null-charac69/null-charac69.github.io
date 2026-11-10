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
    │   ├── site-footer.html
    │   └── site-header.html
    ├── _layouts/
    │   └── default.html
    ├── assets/
    │   ├── css/
    │   │   ├── tokens.css
    │   │   ├── base.css
    │   │   ├── layout.css
    │   │   ├── components.css
    │   │   └── responsive.css
    │   ├── js/
    │   │   ├── app.js
    │   │   └── modules/
    │   └── profile.jpg
    ├── backend/
    │   ├── infra/
    │   ├── src/
    │   └── template.yaml
    ├── index.html
    └── DEPLOYMENT.md

Jekyll assembles the small root index.html from reusable layouts and section includes. JavaScript is split by feature, and CSS is split into design tokens, base rules, layout, components and responsive rules.

## Features

- Responsive editorial portfolio with paper/ink/cobalt light theme and matching navy dark theme.
- Accessible mobile navigation, theme preference, reading progress and reduced-motion support.
- Project filters and expandable architecture/design notes.
- Dynamic public GitHub repository list with search and repository metadata.
- Portfolio assistant powered by Amazon Bedrock through API Gateway and Lambda.
- Browser-local chat history; the API does not persist conversation content.

## Architecture

    Browser
      ├── GitHub Pages + Jekyll (frontend)
      ├── GitHub REST API (public repository metadata)
      └── POST /chat
            └── API Gateway HTTP API
                  └── AWS Lambda (Python 3.12)
                        └── Amazon Bedrock Converse API

No model-provider keys or AWS credentials are sent to the browser. The Lambda execution role invokes Bedrock. The API stack is deployed directly with AWS SAM from an authenticated AWS CLI/CloudShell session; GitHub Actions is not required for the backend.

## Run the frontend locally

    bundle install
    bundle exec jekyll serve

For a hosted preview, GitHub Pages rebuilds the root Jekyll site from main.

## Deploy

Follow DEPLOYMENT.md for:
- AWS identity verification with STS.
- Backend unit tests and SAM template validation.
- Lambda packaging and direct SAM deployment.
- Health endpoint and live Bedrock smoke tests.
- Connecting the API base URL to the public chat widget.

## Project sources

- AgentOS: https://github.com/null-charac69/agentos
- Hybrid RAG Pipeline: https://github.com/null-charac69/hrag-app
- Healthcare Analytics: https://github.com/null-charac69/healthcare_analytics

Project descriptions are grounded in public repository documentation. Unsupported performance figures are not presented as verified results.

## Operational notes

- Chat is a public API. API Gateway throttling and request validation are enabled; configure an AWS Budget before launch.
- Conversation history is stored in the visitor's browser localStorage and included in each chat request. The backend does not persist it.
- Amazon Bedrock, Lambda, API Gateway, CloudWatch and SAM artifact storage can incur charges.
- A former Gemini key was committed to the public repository. Revoke it; removing the file does not remove it from Git history.
