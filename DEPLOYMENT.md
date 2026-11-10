# Deployment guide

The site is published by GitHub Pages from the repository's main branch using its built-in Jekyll publisher. The assistant runs separately on AWS Lambda + API Gateway and uses Amazon Bedrock.

## 1. Fix the old browser key

The former js/config.js committed a Gemini API key into a public repository. Revoke that key in Google AI Studio. Removing the file does not remove the credential from Git history; treat it as compromised.

Do not add provider keys to frontend code.

## 2. Configure GitHub Pages once

Open repository **Settings → Pages → Build and deployment**.

Set:
- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

The normal GitHub Pages **pages build and deployment** workflow will build the root Jekyll site on each main-branch push. There is intentionally no second portfolio deployment workflow.

## 3. AWS region and Bedrock model ID

Choose the AWS region in which the Bedrock model or inference profile is available to your account. For this portfolio, the selected source region is ap-southeast-2 (Sydney). The configured model is global.moonshotai.kimi-k3.1 (Kimi K3.1 Pro - Highspeed). AWS documents the global inference profile as available from Sydney. The global profile can route inference across supported commercial AWS Regions.

Use the exact Model ID or Inference Profile ID shown in the Bedrock console. A foundation model ID and an inference profile ID are not interchangeable. If you use a cross-region inference profile, use that profile ID.

The model ID is configuration, not a secret. Do not store it as a credential.

## 4. Use a dedicated AWS deployment IAM user

Do not use root account access keys. Ideally create a dedicated IAM user for this GitHub deployment, with no AWS console sign-in. Attach a custom policy based on backend/infra/github-deployer-policy.json.

Before attaching the policy, replace:
- <AWS_ACCOUNT_ID> with your 12-digit AWS account ID
- <AWS_REGION> with the region you selected

The deployer policy allows CloudFormation, API Gateway, Lambda, the one named Lambda execution role, the SAM artifact bucket and its deployment logs. Review it in IAM before use. Do not attach AdministratorAccess simply to make a failed deployment pass.

Create an access key for this dedicated IAM user under **IAM → Users → [user] → Security credentials → Create access key → Command Line Interface (CLI)**. Copy the secret access key when AWS displays it; AWS will not show it again.

If you already have access keys from a dedicated deployment user with these permissions, you can use those. Do not use root keys or broadly privileged personal credentials.

## 5. Store credentials in GitHub Secrets

Open this repository:

**Settings → Secrets and variables → Actions → Repository secrets → New repository secret**

Create these two secrets:

| Secret name | Value |
|---|---|
| AWS_ACCESS_KEY_ID | Access key ID from the dedicated IAM user |
| AWS_SECRET_ACCESS_KEY | Secret access key from the same IAM user |

Paste the values directly into GitHub's secret form. Do not send them in chat, commit them into files, or put them in GitHub Variables.

## 6. Store non-secret configuration in GitHub Variables

In **Settings → Secrets and variables → Actions → Repository variables**, create:

| Variable name | Example value | Notes |
|---|---|---|
| AWS_REGION | ap-southeast-2 | Sydney; source region for the global inference profile |
| BEDROCK_MODEL_ID | global.moonshotai.kimi-k3.1 | Kimi K3.1 Pro - Highspeed global inference profile |

Do not add quotes around values in GitHub.

## 7. Deploy the Bedrock API

The deployment workflow defaults to ap-southeast-2 and global.moonshotai.kimi-k3.1 if the two optional repository variables are not created. If you already have repository variables with different values, change them to the values above before deploying.

After adding the two secrets and confirming the two variables:

1. Open **Actions → Deploy Bedrock chat API**.
2. Select **Run workflow → Run workflow**.
3. Open the run summary after it finishes.
4. Copy the **Base URL** shown under “Bedrock API deployment”.

The URL looks like:

    https://<api-id>.execute-api.<region>.amazonaws.com

If the deployment fails with AccessDenied, check the deployment IAM user policy and the Lambda execution role's Bedrock permission. The workflow first runs backend unit tests, validates and builds the SAM template, and verifies the AWS identity. After deployment it runs a health check and a live chat request against Bedrock. If the model returns a validation or model-not-found error, confirm the model access and exact inference-profile ID in the Bedrock console.

## 8. Connect the website to the API

The API base URL is public configuration, not a secret.

Edit _config.yml and set portfolio_api_url to the base URL from the workflow summary. Example:

    portfolio_api_url: "https://abc123.execute-api.ap-south-1.amazonaws.com"

Commit and push that change to main. GitHub Pages will rebuild the site and the assistant will use the new URL.

Do not include /chat at the end; the frontend appends /chat itself.

## 9. Verify the endpoints

Open the health endpoint in a browser or with curl:

    https://<api-id>.execute-api.<region>.amazonaws.com/health

Expected response:

    {"status":"ok","provider":"Amazon Bedrock"}

Then visit https://null-charac69.github.io, open “Ask about my work”, and ask about AgentOS. The browser should call POST /chat on API Gateway; it must never call Bedrock directly.

## Security, cost and chat data

- The API uses CORS origin checks, input validation, bounded conversation history, an output-token cap and API Gateway throttling. CORS is not authentication; public APIs can be called by non-browser clients too.
- The browser stores up to 12 recent messages in localStorage and sends up to 10 messages for each turn. The Lambda does not persist conversations or log prompt content.
- Visitors should not share credentials or sensitive information in the public chat.
- Bedrock model inference is billed by model and token use. Lambda, API Gateway, CloudWatch Logs and SAM's S3 artifact bucket can also incur charges. Check current AWS pricing and configure a billing alert before public launch.
- If an access key is no longer needed, deactivate or delete it in IAM. Prefer GitHub OIDC with short-lived credentials for a later security improvement.
