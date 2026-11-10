import json
import unittest
from unittest.mock import patch

import app


class PortfolioChatTests(unittest.TestCase):
    def test_health_route_does_not_require_origin(self):
        response = app.handler(
            {"requestContext": {"http": {"method": "GET"}}, "rawPath": "/health"},
            None,
        )
        self.assertEqual(response["statusCode"], 200)
        self.assertIn("Amazon Bedrock", response["body"])

    def test_chat_rejects_unknown_origin(self):
        response = app.handler(
            {
                "headers": {"origin": "https://not-the-portfolio.example"},
                "requestContext": {"http": {"method": "POST"}},
                "rawPath": "/chat",
                "body": json.dumps({"messages": [{"role": "user", "content": "Hi"}]}),
            },
            None,
        )
        self.assertEqual(response["statusCode"], 403)

    def test_normalise_messages_merges_adjacent_roles(self):
        messages = app._normalise_messages([
            {"role": "user", "content": "first"},
            {"role": "user", "content": "second"},
        ])
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]["content"][0]["text"], "first\nsecond")

    def test_chat_uses_bedrock_converse(self):
        event = {
            "headers": {"origin": app.ALLOWED_ORIGIN},
            "requestContext": {"http": {"method": "POST"}},
            "rawPath": "/chat",
            "body": json.dumps({"messages": [{"role": "user", "content": "What is AgentOS?"}]}),
        }
        mocked_result = {
            "output": {
                "message": {
                    "content": [{"text": "AgentOS is a LangGraph-based research pipeline."}]
                }
            }
        }
        with patch.object(app.BEDROCK, "converse", return_value=mocked_result) as converse:
            response = app.handler(event, None)
        self.assertEqual(response["statusCode"], 200)
        self.assertIn("AgentOS", json.loads(response["body"])["reply"])
        converse.assert_called_once()


if __name__ == "__main__":
    unittest.main()
