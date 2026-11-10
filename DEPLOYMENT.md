# Chatbot setup — one-time phone configuration

The portfolio frontend is on GitHub Pages. Its chat API is already deployed on Vercel and calls Kimi K3.1 through Amazon Bedrock. **You do not need AWS Console, a laptop, AWS SAM, or GitHub Actions for this setup.**

## 1. Add the two AWS keys to Vercel

Open this project settings page on your phone:

https://vercel.com/anantthakur2000-1624/anant-portfolio-bedrock-api/settings/environment-variables

Add these two environment variables. Set the environment to **Production** and store each value as an encrypted/sensitive secret.

| Name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | Your AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | The matching AWS secret access key |

Do not paste either key into GitHub files, frontend code, or ChatGPT. Do not reuse root account keys. The IAM user behind these keys must have `bedrock:InvokeModel` permission for the configured Kimi inference profile.

The region and model ID are already configured by the API defaults:

- Region: `ap-southeast-2`
- Model: `global.moonshotai.kimi-k3.1`

No other variables are required for the initial setup.

## 2. Redeploy once

After saving both variables, open the Vercel project's Deployments tab, open the latest production deployment, tap the three-dot menu and choose **Redeploy**. The new deployment will receive the saved environment variables.

## 3. Test

The API health endpoint is already live:

https://anant-portfolio-bedrock-api.vercel.app/health

It returns `{"status":"ok","provider":"Amazon Bedrock"}` when the service is reachable. After adding the keys and redeploying, test the chat from the portfolio:

https://null-charac69.github.io/

Open **Ask about my work** and ask: "What does AgentOS do?"

A successful answer confirms the complete browser → Vercel → Bedrock → Kimi path.

## Security and operating costs

- The keys stay in Vercel's server-side environment; they are never sent to visitors' browsers.
- The API only accepts browser requests from `https://null-charac69.github.io`. CORS is not authentication, so the endpoint can still be called by non-browser clients.
- Bedrock model inference is billed by AWS. Vercel's Python runtime is currently available in Beta on all plans; usage remains subject to the plan's limits.
- The browser stores up to 12 recent messages in localStorage. The API does not persist conversation history or log visitor prompt contents.
- If these AWS keys were created only for the failed GitHub Actions setup, remove the old GitHub repository secrets when convenient and deactivate the unused key after verifying the Vercel chatbot works.
