# Anant Kumar Thakur — Portfolio

Personal engineering portfolio for Anant Kumar Thakur, AI/ML and Generative AI Engineer.

Live site: https://null-charac69.github.io/

## What is included

- Editorial-style, responsive portfolio with accessible navigation and reduced-motion support.
- Selected public engineering projects with repository metadata refreshed from the GitHub API.
- Experience, education, technical focus and contact information.
- Portfolio chat connected to Amazon Bedrock through a server-side API.
- Browser-local chat history; no conversation database is provisioned.
- GitHub Actions workflows for GitHub Pages and AWS SAM deployments.

## Architecture

    Visitor browser
      ├── GitHub Pages: HTML, CSS and JavaScript
      ├── GitHub REST API: public repository metadata
      └── HTTPS POST /chat
            └── API Gateway HTTP API
                  └── AWS Lambda (Python)
                        └── Amazon Bedrock Converse API

The browser never receives AWS credentials or a model-provider API key. The Lambda execution role has permission to invoke the configured Bedrock model. GitHub Actions authenticates to AWS using GitHub OIDC rather than long-lived AWS access keys.

## Run locally

The frontend has no Node build step:

    python3 -m http.server 8080

Open http://localhost:8080. The portfolio and GitHub project metadata work without AWS configuration. To enable chat locally, set the PORTFOLIO_API_URL value in runtime-config.js to the deployed API base URL.

## Deploy

Read DEPLOYMENT.md for the AWS OIDC setup, Bedrock model configuration, GitHub repository variables/secrets and Pages settings.

## Project sources

- AgentOS: https://github.com/null-charac69/agentos
- Hybrid RAG Pipeline: https://github.com/null-charac69/hrag-app
- Healthcare Analytics: https://github.com/null-charac69/healthcare_analytics

Project copy is based on the public repository documentation. Unsupported outcome metrics are not presented as verified results.

## Operational notes

- Chat is a public endpoint. API Gateway throttling and request validation are enabled; monitor usage and configure an AWS Budget before publishing the backend.
- Conversation history is stored only in the visitor's browser localStorage and is sent with each chat request. It is not persisted by this backend.
- Amazon Bedrock inference is billed by model and token usage. AWS Lambda and API Gateway may also incur charges.
- The previous Gemini key was committed to the public repository. Revoke it; deleting the old file does not remove the credential from Git history.
