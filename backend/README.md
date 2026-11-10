# Portfolio chat backend

AWS SAM application providing:

- API Gateway HTTP API routes: GET /health and POST /chat.
- Python 3.12 Lambda using Amazon Bedrock Converse.
- A Lambda execution role with model invocation and CloudWatch logging permissions.
- Bounded message size/history, origin validation, request validation and concise error responses.
- No database and no server-side conversation persistence.

Deploy with the repository workflow after configuring GitHub Actions secrets and variables. See DEPLOYMENT.md.
