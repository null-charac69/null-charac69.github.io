#!/usr/bin/env bash
set -Eeuo pipefail

BACKEND_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$BACKEND_DIR/.." && pwd)"
cd "$BACKEND_DIR"

export AWS_REGION="${AWS_REGION:-ap-southeast-2}"
export AWS_DEFAULT_REGION="$AWS_REGION"
export BEDROCK_MODEL_ID="${BEDROCK_MODEL_ID:-global.moonshotai.kimi-k3.1}"
export SAM_CLI_TELEMETRY=0

STACK_NAME="${STACK_NAME:-anant-portfolio-api}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-https://null-charac69.github.io}"
PYTHON_BIN="${PYTHON_BIN:-python3.12}"
VENV_DIR="$BACKEND_DIR/.venv"

for command_name in aws sam curl "$PYTHON_BIN"; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command_name" >&2
    exit 1
  fi
done

printf '\n[1/7] Verifying AWS identity with STS\n'
aws sts get-caller-identity --output json

printf '\n[2/7] Preparing Python 3.12 environment\n'
if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install -r src/requirements.txt

printf '\n[3/7] Running backend unit tests\n'
PYTHONPATH="$BACKEND_DIR/src" "$VENV_DIR/bin/python" -m unittest discover -s tests -p 'test_*.py' -v

printf '\n[4/7] Validating SAM template\n'
sam validate --lint --template-file template.yaml

printf '\n[5/7] Building Lambda package with SAM\n'
sam build --template-file template.yaml --build-dir .aws-sam/build

printf '\n[6/7] Deploying API Gateway, Lambda and IAM resources\n'
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name "$STACK_NAME" \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --region "$AWS_REGION" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    "AllowedOrigin=$ALLOWED_ORIGIN" \
    "BedrockModelId=$BEDROCK_MODEL_ID"

API_URL="$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)"

if [[ -z "$API_URL" || "$API_URL" == "None" ]]; then
  echo "Could not read ApiUrl from the deployed CloudFormation stack." >&2
  exit 1
fi

printf '\n[7/7] Checking health and sending a real Bedrock prompt\n'
HEALTH_RESPONSE="$(curl --fail --silent --show-error --max-time 15 "$API_URL/health")"
printf '%s' "$HEALTH_RESPONSE" | "$VENV_DIR/bin/python" -c '
import json, sys
body = json.load(sys.stdin)
assert body.get("status") == "ok", body
assert body.get("provider") == "Amazon Bedrock", body
print("Health endpoint passed:", body)
'

CHAT_RESPONSE="$(curl --fail --silent --show-error --max-time 35 \
  -X POST "$API_URL/chat" \
  -H "Origin: $ALLOWED_ORIGIN" \
  -H "Content-Type: application/json" \
  --data-binary '{"messages":[{"role":"user","content":"In one concise sentence, what does Anant’s AgentOS project do?"}]}')"

CHAT_RESPONSE="$CHAT_RESPONSE" "$VENV_DIR/bin/python" -c '
import json, os
body = json.loads(os.environ["CHAT_RESPONSE"])
reply = body.get("reply")
if not isinstance(reply, str) or not reply.strip():
    raise SystemExit("Live Bedrock check failed: response did not contain a non-empty reply.")
print("Live Bedrock check passed. Reply:")
print(reply[:800])
'

printf '\nDeployment and live model smoke test succeeded.\n'
printf 'API base URL: %s\n' "$API_URL"

# Update the checked-out frontend config only after the live model test succeeds.
CONFIG_FILE="$REPO_ROOT/_config.yml"
if [[ -f "$CONFIG_FILE" ]]; then
  "$VENV_DIR/bin/python" - "$CONFIG_FILE" "$API_URL" <<'PY'
from pathlib import Path
import re
import sys

config_path = Path(sys.argv[1])
api_url = sys.argv[2].rstrip("/")
text = config_path.read_text(encoding="utf-8")
replacement = f'portfolio_api_url: "{api_url}"'
pattern = r"(?m)^portfolio_api_url:\s*.*$"
updated, count = re.subn(pattern, replacement, text)
if count != 1:
    raise SystemExit("Expected exactly one portfolio_api_url setting in _config.yml.")
config_path.write_text(updated, encoding="utf-8")
print(f"Updated {config_path} with the deployed API base URL.")
PY
  printf 'Next: review _config.yml, then commit and push it to main to connect the public widget.\n'
fi
