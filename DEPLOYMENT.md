# Direct deployment guide

The portfolio frontend is published from the `main` branch through GitHub Pages/Jekyll. The chat API is a separate AWS SAM stack. The backend does not use GitHub Actions.

## 1. Security

The former public repository contained a Gemini API key in its Git history. Revoke that key in Google AI Studio; deleting the old file did not remove the key from prior commits.

Do not put AWS credentials or Bedrock keys in frontend code, repository files, chat messages, or command output. The API invokes Bedrock using the Lambda execution role.

## 2. Model configuration

| Setting | Value |
|---|---|
| AWS Region | `ap-southeast-2` (Sydney) |
| Bedrock model/inference profile | `global.moonshotai.kimi-k3.1` |
| Runtime | Python 3.12 |
| Stack name | `anant-portfolio-api` |
| Allowed browser origin | `https://null-charac69.github.io` |

The model ID is configuration, not a secret.

## 3. Obtain an AWS CLI identity

Run the deployment from AWS CloudShell or a trusted local machine with AWS CLI v2, AWS SAM CLI, and Python 3.12 installed. CloudShell uses the identity signed in to the AWS console; on a local machine, use an IAM role, IAM Identity Center, or a dedicated IAM deployment user.

Do not use root access keys. The deployment identity needs permission to manage the SAM CloudFormation stack, API Gateway, the named Lambda function, its execution role, the SAM artifact bucket, and the Lambda log group. A starting least-privilege policy is in `backend/infra/sam-deployer-policy.json`; replace its account and region placeholders before attaching it to a dedicated IAM user.

Verify the identity before making changes:

```bash
aws sts get-caller-identity
aws configure set region ap-southeast-2
sam --version
python3.12 --version
```

The STS command must return the AWS account and principal you intend to deploy with. Do not proceed if it returns the wrong account or role.

## 4. Run the deployment

Clone or update the repository, then run the one-shot script from the repository root:

```bash
bash backend/deploy.sh
```

The script performs these operations in order:

1. Verifies AWS credentials using STS.
2. Creates a Python 3.12 virtual environment and installs the backend dependency.
3. Runs all backend unit tests.
4. Runs `sam validate --lint`.
5. Builds the Lambda package with `sam build`.
6. Deploys API Gateway, Lambda, the execution role and log group with `sam deploy`.
7. Checks `GET /health`, sends a real prompt through `POST /chat`, and verifies that Bedrock returned non-empty text.

The script only writes the API base URL into the local `_config.yml` after the health check and live model request both succeed. It does not push to GitHub automatically.

## 5. Publish the API URL to the frontend

After the deployment script succeeds, inspect the changed `_config.yml`. It should contain the deployed API base URL under `portfolio_api_url` (without a trailing `/chat`).

Commit and push that one config change to `main`:

```bash
git add _config.yml
git commit -m "Connect portfolio chat API"
git push origin main
```

GitHub Pages will rebuild the frontend. The chat widget then calls `POST /chat` on API Gateway.

## 6. Cost and data handling

- Bedrock inference is metered. Lambda, API Gateway, CloudWatch Logs and the SAM S3 artifact bucket can also incur charges. Configure an AWS Budget before enabling public chat.
- API Gateway throttling is set to 3 requests/second with a burst limit of 8. This is not user authentication; a public API can also be called outside a browser.
- The Lambda does not persist conversation history or log prompt content. The browser stores up to 12 recent messages in localStorage and sends up to 10 messages per turn.
- Do not invite visitors to submit credentials or sensitive information.
- The previous GitHub Actions deployment secrets are not used by this direct deployment path. Remove the old `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` repository secrets in GitHub Settings if they are no longer used elsewhere; rotate/deactivate the corresponding IAM access key if it was created only for that workflow.
