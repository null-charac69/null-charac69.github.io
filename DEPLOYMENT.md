# Direct deployment guide

The portfolio frontend is published from the `main` branch through GitHub Pages/Jekyll. The chat API is a separate AWS SAM stack. The backend no longer uses a GitHub Actions workflow.

## 1. Security

The former public repository contained a Gemini API key in its Git history. Revoke that key in Google AI Studio; deleting the old file did not remove the key from prior commits.

Do not put AWS credentials or Bedrock keys in frontend code, repository files, chat messages, or command output. The API invokes Bedrock using the Lambda execution role.

## 2. Model configuration

The backend is configured for:

| Setting | Value |
|---|---|
| AWS Region | `ap-southeast-2` (Sydney) |
| Bedrock model/inference profile | `global.moonshotai.kimi-k3.1` |
| Runtime | Python 3.12 |
| Stack name | `anant-portfolio-api` |
| Allowed browser origin | `https://null-charac69.github.io` |

The model ID is configuration, not a secret.

## 3. Obtain an AWS CLI identity

Run the deployment from AWS CloudShell or a trusted local machine with AWS CLI v2 and AWS SAM CLI installed. CloudShell uses the identity signed in to the AWS console; on a local machine, use an IAM role, IAM Identity Center, or a dedicated IAM deployment user.

Do not use root access keys. The deployment identity needs permission to manage the SAM CloudFormation stack, API Gateway, the named Lambda function, its execution role, the SAM artifact bucket, and the Lambda log group. A starting least-privilege policy is in `backend/infra/sam-deployer-policy.json`; replace its account and region placeholders before attaching it to a dedicated IAM user.

Verify the identity before making changes:

```bash
aws sts get-caller-identity
aws configure set region ap-southeast-2
aws configure set output json
sam --version
python3 --version
```

The STS command must return the AWS account and principal you intend to deploy with. Do not proceed if it returns the wrong account or role.

## 4. Test, validate, build and deploy

From the repository root:

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r src/requirements.txt

PYTHONPATH=src python -m unittest discover -s tests -p 'test_*.py' -v

sam validate --lint --template-file template.yaml
sam build --template-file template.yaml

sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name anant-portfolio-api \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --region ap-southeast-2 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    AllowedOrigin=https://null-charac69.github.io \
    BedrockModelId=global.moonshotai.kimi-k3.1
```

The deployment creates an HTTP API, a Python Lambda function, a Lambda execution role scoped to the configured Kimi inference profile/model, and a CloudWatch log group. SAM uploads the deployment artifact to its managed S3 bucket.

## 5. Verify the deployed API and make a live Bedrock request

Still from the same authenticated shell:

```bash
API_URL=$(aws cloudformation describe-stacks \
  --stack-name anant-portfolio-api \
  --region ap-southeast-2 \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

test -n "$API_URL" && test "$API_URL" != "None"

curl --fail --silent --show-error "$API_URL/health"
```

Expected health response:

```json
{"status":"ok","provider":"Amazon Bedrock"}
```

Then send a real prompt through API Gateway to the Lambda/Bedrock Converse path:

```bash
CHAT_RESPONSE=$(curl --fail --silent --show-error --max-time 35 \
  -X POST "$API_URL/chat" \
  -H "Origin: https://null-charac69.github.io" \
  -H "Content-Type: application/json" \
  --data-binary '{"messages":[{"role":"user","content":"In one concise sentence, what does Anant’s AgentOS project do?"}]}')

CHAT_RESPONSE="$CHAT_RESPONSE" python3 - <<'PY'
import json
import os

result = json.loads(os.environ["CHAT_RESPONSE"])
reply = result.get("reply")
if not isinstance(reply, str) or not reply.strip():
    raise SystemExit("Live Bedrock test failed: API returned no non-empty reply.")
print("Live Bedrock test passed.")
print("Response:", reply)
PY
```

A successful health response only proves the HTTP API and Lambda health route are reachable. The second test is required to prove the configured Bedrock model can return a non-empty answer. If it fails, inspect the Lambda log group `/aws/lambda/anant-portfolio-api-chat` and check Bedrock model access, inference-profile permissions, and the IAM role policy.

## 6. Connect the public portfolio

After both API checks pass, copy the API base URL printed below (it will resemble `https://<api-id>.execute-api.ap-southeast-2.amazonaws.com`). Edit `_config.yml`:

```yaml
portfolio_api_url: "https://<api-id>.execute-api.ap-southeast-2.amazonaws.com"
```

Use the base URL only; do not append `/chat`. Commit and push the change to `main`. GitHub Pages will rebuild the frontend, and the chat widget will call `POST /chat`.

## 7. Cost and data handling

- Bedrock inference is metered. Lambda, API Gateway, CloudWatch Logs and the SAM S3 artifact bucket can also incur charges. Configure an AWS Budget before enabling public chat.
- API Gateway throttling is set to 3 requests/second with a burst limit of 8. This is not user authentication; a public API can also be called outside a browser.
- The Lambda does not persist conversation history or log prompt content. The browser stores up to 12 recent messages in localStorage and sends up to 10 messages per turn.
- Do not invite visitors to submit credentials or sensitive information.
- The previous GitHub Actions deployment secrets are not used by this direct deployment path. Remove the old `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` repository secrets in GitHub Settings if they are no longer used elsewhere; rotate/deactivate the corresponding IAM access key if it was created only for that workflow.
