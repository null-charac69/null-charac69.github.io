# Deployment guide

This repository deploys the website to GitHub Pages and the chat API to AWS Lambda + API Gateway. The chat model is Amazon Bedrock.

## 1. Revoke the old browser key

The former js/config.js committed a Gemini API key into a public repository. Revoke that key in Google AI Studio. The old file is removed in this rebuild, but the value remains in Git history and must be considered compromised.

Do not add a replacement provider key to frontend JavaScript.

## 2. AWS prerequisites

Use an AWS account where you can create IAM roles, Lambda functions, API Gateway resources and CloudFormation stacks.

Recommended initial configuration:

| Setting | Value |
|---|---|
| AWS Region | ap-south-1 (Mumbai) |
| Bedrock model ID | apac.amazon.nova-lite-v1:0 |
| CloudFormation stack | anant-portfolio-api |
| Lambda function | anant-portfolio-api-chat |

The APAC Nova Lite inference profile is documented for use from Mumbai. Cross-Region inference can route within the APAC geography. Check current model/region availability and account quotas in the AWS console before deployment:

- Nova Lite model card and regional availability: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-lite.html
- Amazon Bedrock inference profiles: https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html

In Amazon Bedrock, confirm that the configured model/profile is available to your account. The Lambda execution role is restricted to the Nova Lite foundation model and the APAC inference profile.

## 3. Create GitHub's AWS OIDC identity provider

In AWS IAM, open Identity providers and create an OpenID Connect provider if one does not already exist:

- Provider URL: https://token.actions.githubusercontent.com
- Audience: sts.amazonaws.com

An OIDC provider is account-wide. Do not create a duplicate if it already exists.

GitHub OIDC lets Actions exchange a job token for short-lived AWS credentials. The workflow does not need AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY. See GitHub's AWS OIDC guide:

https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws

## 4. Create the GitHub Actions deployment role

Create an IAM role named AnantPortfolioGitHubDeployRole.

Use the trust policy in backend/infra/github-actions-trust-policy.json. Replace <AWS_ACCOUNT_ID> with your 12-digit AWS account ID. The trust condition is intentionally restricted to this repository's main branch:

    repo:null-charac69/null-charac69.github.io:ref:refs/heads/main

Attach the inline permissions policy in backend/infra/github-deployer-policy.json after replacing <AWS_ACCOUNT_ID> and <AWS_REGION> (use ap-south-1 unless you deliberately choose another supported setup).

This is a dedicated deployment role. Review the policy in IAM before attaching it; it grants the workflow the ability to manage the portfolio's CloudFormation, Lambda, API Gateway and SAM artifact resources. The runtime Lambda role is separate and has only model invocation plus basic CloudWatch logging permissions.

Copy the role ARN after creation. It will look like:

    arn:aws:iam::<AWS_ACCOUNT_ID>:role/AnantPortfolioGitHubDeployRole

## 5. Add GitHub Actions secret and variables

In the repository, open Settings → Secrets and variables → Actions.

Add this repository secret:

| Name | Value |
|---|---|
| AWS_ROLE_ARN | ARN of AnantPortfolioGitHubDeployRole |

Add these repository variables:

| Name | Initial value | Purpose |
|---|---|---|
| AWS_REGION | ap-south-1 | AWS deployment and Bedrock source region |
| BEDROCK_MODEL_ID | apac.amazon.nova-lite-v1:0 | Bedrock APAC inference profile |
| PORTFOLIO_API_URL | Leave blank initially | API base URL; fill after the backend deploys |

AWS_REGION, BEDROCK_MODEL_ID and PORTFOLIO_API_URL are configuration values, not credentials. Only AWS_ROLE_ARN is placed in Actions Secrets for this workflow. Do not create or store long-lived AWS access keys.

## 6. Configure GitHub Pages

In the repository, open Settings → Pages → Build and deployment and set Source to GitHub Actions.

The Deploy portfolio workflow assembles only the public website files and publishes them to the root of https://null-charac69.github.io/.

## 7. Deploy the backend

After the code is on main and the AWS secret/variables are populated:

1. Open Actions → Deploy Bedrock chat API.
2. Select Run workflow.
3. Wait for the Deploy API stack job to complete.
4. Open the workflow run summary and copy the Base URL printed under “Bedrock API deployment”.

The output will look like:

    https://<api-id>.execute-api.ap-south-1.amazonaws.com

## 8. Connect the frontend to the API

Return to Settings → Secrets and variables → Actions → Variables and set:

- PORTFOLIO_API_URL = the API base URL from the previous step (no trailing slash and no /chat suffix).

Then open Actions → Deploy portfolio → Run workflow. The workflow writes this URL into the generated runtime-config.js file during deployment. The URL is public; it is not a secret.

## 9. Verify

Open the health endpoint in a browser:

    https://<api-id>.execute-api.ap-south-1.amazonaws.com/health

Expected response:

    {"status":"ok","provider":"Amazon Bedrock"}

Then visit the portfolio, open Ask about my work, and ask about AgentOS. Browser developer tools should show a POST /chat request to API Gateway, not a direct call to Bedrock.

## Cost and public-endpoint controls

Amazon Bedrock is not a free service. Inference is charged according to the selected model, region, input tokens and output tokens. API Gateway and Lambda can also create charges depending on usage. Check the current Amazon Bedrock pricing page and set an AWS Budget/billing alert before enabling the public chat:

https://aws.amazon.com/bedrock/pricing/

The API has request-size and message-length limits, a bounded conversation window, and API Gateway route throttling. CORS is a browser policy, not authentication: anyone can call a public API endpoint outside a browser. Monitor CloudWatch logs and usage, and disable the stack or add stronger abuse controls if unexpected traffic appears.

## Chat data handling

- The browser stores up to 12 recent user/assistant messages in localStorage.
- Up to 10 recent messages are sent to Lambda for each turn.
- The Lambda does not write conversation content to a database or log prompt text.
- Visitors should not enter passwords, personal data or confidential material.
- Clearing the browser's site data removes the locally stored conversation.

## Troubleshooting

| Symptom | Check |
|---|---|
| Backend workflow says AWS_ROLE_ARN is missing | Add the AWS_ROLE_ARN repository secret. |
| Not authorized to perform sts:AssumeRoleWithWebIdentity | Check the OIDC provider, role trust policy, repository name and main branch subject. |
| AccessDeniedException from Bedrock | Check the Lambda execution role policy, model ID, inference-profile availability and account model access. |
| Browser chat reports a network/CORS error | Check AllowedOrigin, PORTFOLIO_API_URL and the API Gateway deployment. |
| Website works but chat says deployment setup is required | Set PORTFOLIO_API_URL and rerun Deploy portfolio. |
| Pages workflow cannot deploy | Set the Pages source to GitHub Actions. |
