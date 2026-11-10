"""Small, stateless chat API using Amazon Bedrock Converse."""

import base64
import json
import logging
import os
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

LOG = logging.getLogger()
LOG.setLevel(logging.INFO)

MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "apac.amazon.nova-lite-v1:0")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "https://null-charac69.github.io")
MAX_OUTPUT_TOKENS = min(max(int(os.environ.get("MAX_OUTPUT_TOKENS", "600")), 128), 900)
MAX_BODY_BYTES = 14_000
MAX_MESSAGES = 10
MAX_MESSAGE_CHARS = 1_800

BEDROCK = boto3.client(
    "bedrock-runtime",
    config=Config(
        connect_timeout=3,
        read_timeout=24,
        retries={"max_attempts": 2, "mode": "standard"},
    ),
)

PORTFOLIO_CONTEXT = """
PERSON: Anant Kumar Thakur.
ROLE: AI/ML and Generative AI Engineer at Tata Elxsi. Approximately three years of
AI/ML engineering experience. Based in Pune, India.
EDUCATION: B.Tech in Mechanical Engineering, National Institute of Technology Srinagar.
FOCUS: Generative AI, LLM applications, retrieval-augmented generation, agentic workflows,
retrieval quality, evaluation, Python APIs, and production-minded AI engineering.

PUBLIC PROJECT 1 — AgentOS:
An autonomous research workflow documented in the public repository
https://github.com/null-charac69/agentos. It uses a LangGraph state graph with five
specialist stages: planner, web search, retrieval, code executor and critic. The design
includes parallel search, Qdrant-based episodic recall, a critic-and-revision loop,
FastAPI server-sent events, and Redis caching. The documented stack includes Python,
LangGraph, FastAPI, Qdrant, Redis and Docker.

PUBLIC PROJECT 2 — Hybrid RAG Pipeline:
A retrieval-augmented generation pipeline documented at
https://github.com/null-charac69/hrag-app. It combines dense BGE embeddings and BM25
sparse retrieval, uses Reciprocal Rank Fusion for merging, a BGE cross-encoder for
reranking, citation verification, and RAGAS evaluation. The documented stack includes
Qdrant, FastAPI, Streamlit, SQLite and Docker.

PUBLIC PROJECT 3 — Healthcare Analytics:
A healthcare analytics prototype documented at
https://github.com/null-charac69/healthcare_analytics. Its README describes MRI and
chest X-ray classification workflows, patient-outcome prediction concepts and model
interpretability. The documented stack includes React, FastAPI, PyTorch, MLflow and DVC.
Do not claim independently validated clinical performance or production deployment.

PROFESSIONAL LINKS:
GitHub: https://github.com/null-charac69
LinkedIn: https://www.linkedin.com/in/anant-kumar-b12976178/
Email: anant.thakur2000@gmail.com

LIMITS:
Client-specific work, internal company projects, confidential metrics, exact employment
dates and unpublished personal details are not included in the public portfolio context.
Do not infer or invent them.
""".strip()

SYSTEM_PROMPT = """
You are the portfolio guide for Anant Kumar Thakur. Help visitors understand his
published experience, technical focus and public projects.

Use only the PORTFOLIO CONTEXT below for claims about Anant. Do not invent employers,
dates, client names, project outcomes, benchmarks, certifications, awards, or skills.
Distinguish what a repository README documents from what has been independently
validated. Do not repeat unsupported accuracy, revenue, latency or business-impact
figures. For confidential work, say that the public portfolio does not disclose details.

Answer in clear, direct language. Prefer concise answers, but explain architecture and
trade-offs when asked. You are a portfolio assistant, not Anant himself: never claim to
be the person. If a question is outside the published professional context, say so and
redirect to the relevant public links or contact details.

PORTFOLIO CONTEXT:
""" + PORTFOLIO_CONTEXT


def _response(status_code: int, payload: dict[str, Any], origin: str | None):
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Vary": "Origin",
    }
    if origin and origin == ALLOWED_ORIGIN:
        headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(payload, ensure_ascii=False),
    }


def _normalise_messages(raw_messages: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_messages, list) or not raw_messages:
        raise ValueError("Send a non-empty messages array.")
    if len(raw_messages) > MAX_MESSAGES:
        raw_messages = raw_messages[-MAX_MESSAGES:]

    messages: list[dict[str, Any]] = []
    for item in raw_messages:
        if not isinstance(item, dict):
            raise ValueError("Each message must be an object.")
        role = item.get("role")
        content = item.get("content")
        if role not in ("user", "assistant"):
            raise ValueError("Message role must be user or assistant.")
        if not isinstance(content, str):
            raise ValueError("Message content must be text.")
        content = content.strip()
        if not content or len(content) > MAX_MESSAGE_CHARS:
            raise ValueError("Each message must contain 1–1,800 characters.")

        # Bedrock Converse expects alternating user/assistant turns. Merge adjacent
        # same-role entries, which can occur when an earlier network request failed.
        if messages and messages[-1]["role"] == role:
            previous = messages[-1]["content"][0]["text"]
            combined = previous + "\n" + content
            if len(combined) > MAX_MESSAGE_CHARS:
                combined = combined[-MAX_MESSAGE_CHARS:]
            messages[-1]["content"][0]["text"] = combined
        else:
            messages.append({"role": role, "content": [{"text": content}]})

    if not messages or messages[-1]["role"] != "user":
        raise ValueError("The last message must be from the visitor.")
    return messages


def handler(event: dict[str, Any], _context: Any):
    headers = event.get("headers") or {}
    request_origin = headers.get("origin") or headers.get("Origin")

    if request_origin != ALLOWED_ORIGIN:
        return _response(403, {"error": "Origin not allowed."}, None)

    method = (
        (event.get("requestContext") or {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or ""
    )
    path = (event.get("rawPath") or event.get("path") or "").rstrip("/")

    if method == "GET" and path.endswith("/health"):
        return _response(200, {"status": "ok", "provider": "Amazon Bedrock"}, request_origin)

    if method != "POST" or not path.endswith("/chat"):
        return _response(404, {"error": "Route not found."}, request_origin)

    raw_body = event.get("body") or ""
    if event.get("isBase64Encoded"):
        try:
            raw_body = base64.b64decode(raw_body, validate=True).decode("utf-8")
        except (ValueError, UnicodeDecodeError):
            return _response(400, {"error": "Invalid request body."}, request_origin)

    if not isinstance(raw_body, str) or len(raw_body.encode("utf-8")) > MAX_BODY_BYTES:
        return _response(413, {"error": "Request is too large."}, request_origin)

    try:
        body = json.loads(raw_body or "{}")
        messages = _normalise_messages(body.get("messages"))
    except (json.JSONDecodeError, AttributeError, ValueError) as exc:
        return _response(400, {"error": str(exc) or "Invalid request."}, request_origin)

    try:
        result = BEDROCK.converse(
            modelId=MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            messages=messages,
            inferenceConfig={
                "maxTokens": MAX_OUTPUT_TOKENS,
                "temperature": 0.25,
                "topP": 0.9,
            },
        )
        blocks = result.get("output", {}).get("message", {}).get("content", [])
        reply = "\n".join(
            block.get("text", "")
            for block in blocks
            if isinstance(block, dict) and isinstance(block.get("text"), str)
        ).strip()
        if not reply:
            LOG.warning("Bedrock returned no text content.")
            return _response(502, {"error": "The assistant returned no answer. Try again."}, request_origin)
        return _response(200, {"reply": reply}, request_origin)

    except ClientError as exc:
        error_code = (exc.response.get("Error") or {}).get("Code", "BedrockError")
        LOG.warning("Bedrock request failed: %s", error_code)
        if error_code in ("ThrottlingException", "ServiceUnavailableException", "ModelNotReadyException"):
            return _response(503, {"error": "The assistant is busy. Please try again shortly."}, request_origin)
        return _response(502, {"error": "The assistant could not complete that request."}, request_origin)
    except (BotoCoreError, TimeoutError):
        LOG.exception("Bedrock transport error.")
        return _response(503, {"error": "The assistant is temporarily unavailable."}, request_origin)
    except Exception:
        LOG.exception("Unexpected portfolio chat error.")
        return _response(500, {"error": "An unexpected error occurred."}, request_origin)
