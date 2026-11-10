"""Kimi K3.1 Bedrock chat logic for the portfolio's Vercel API."""

import json
import logging
import os
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

LOG = logging.getLogger(__name__)

MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "global.moonshotai.kimi-k3.1")
AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-2")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "https://null-charac69.github.io")
MAX_OUTPUT_TOKENS = min(max(int(os.environ.get("MAX_OUTPUT_TOKENS", "600")), 128), 900)
MAX_BODY_BYTES = 14_000
MAX_MESSAGES = 10
MAX_MESSAGE_CHARS = 1_800

PORTFOLIO_CONTEXT = """
Anant Kumar Thakur is an AI/ML and Generative AI Engineer at Tata Elxsi, with
approximately three years of AI/ML engineering experience. He is based in Pune, India.
He has a B.Tech in Mechanical Engineering from NIT Srinagar.

Public project — AgentOS:
https://github.com/null-charac69/agentos
An autonomous research workflow documented with a LangGraph state graph and five
specialist stages: planner, web search, retrieval, code executor and critic. The design
includes parallel search, Qdrant-based episodic recall, a critic-and-revision loop,
FastAPI server-sent events, and Redis caching.

Public project — Hybrid RAG Pipeline:
https://github.com/null-charac69/hrag-app
A retrieval-augmented generation pipeline combining dense BGE embeddings and BM25 sparse
retrieval, Reciprocal Rank Fusion, BGE cross-encoder reranking, citation verification
and RAGAS evaluation.

Public project — Healthcare Analytics:
https://github.com/null-charac69/healthcare_analytics
A healthcare analytics prototype whose README describes MRI and chest X-ray
classification workflows, patient-outcome prediction concepts and model interpretability.
Do not claim independently validated clinical performance or production deployment.

Professional links:
GitHub: https://github.com/null-charac69
LinkedIn: https://www.linkedin.com/in/anant-kumar-b12976178/
Email: anant.thakur2000@gmail.com

Do not invent client work, confidential company projects, metrics, awards, certifications,
employment dates or unpublished details.
""".strip()

SYSTEM_PROMPT = """You are the portfolio guide for Anant Kumar Thakur.
Answer visitor questions using only the portfolio context below for claims about Anant.
Distinguish documented project design from independently validated results. Do not invent
employers, clients, dates, performance figures, awards, certifications or skills.
For confidential work, say that the public portfolio does not disclose details.
Use clear, direct language. You are not Anant and must not claim to be him.
For questions outside the published professional context, say so and point visitors to
the relevant public links or contact details.

PORTFOLIO CONTEXT:
""" + PORTFOLIO_CONTEXT


def _normalise_messages(raw_messages: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_messages, list) or not raw_messages:
        raise ValueError("Send a non-empty messages array.")

    messages: list[dict[str, Any]] = []
    for item in raw_messages[-MAX_MESSAGES:]:
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

        if messages and messages[-1]["role"] == role:
            previous = messages[-1]["content"][0]["text"]
            messages[-1]["content"][0]["text"] = (previous + "\n" + content)[-MAX_MESSAGE_CHARS:]
        else:
            messages.append({"role": role, "content": [{"text": content}]})

    if not messages or messages[0]["role"] != "user":
        raise ValueError("The conversation must start with a visitor message.")
    if messages[-1]["role"] != "user":
        raise ValueError("The last message must be from the visitor.")
    return messages


def chat(payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    try:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        if len(raw) > MAX_BODY_BYTES:
            return 413, {"error": "Request is too large."}
        messages = _normalise_messages(payload.get("messages"))
    except (TypeError, ValueError, AttributeError) as exc:
        return 400, {"error": str(exc) or "Invalid request."}

    if not os.environ.get("AWS_ACCESS_KEY_ID") or not os.environ.get("AWS_SECRET_ACCESS_KEY"):
        LOG.error("AWS Bedrock credentials are not configured in the Vercel environment.")
        return 503, {"error": "The chat service is not configured yet."}

    try:
        client = boto3.client(
            "bedrock-runtime",
            region_name=AWS_REGION,
            config=Config(
                connect_timeout=4,
                read_timeout=28,
                retries={"max_attempts": 2, "mode": "standard"},
            ),
        )
        result = client.converse(
            modelId=MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            messages=messages,
            inferenceConfig={"maxTokens": MAX_OUTPUT_TOKENS},
        )
        blocks = result.get("output", {}).get("message", {}).get("content", [])
        reply = "\n".join(
            block.get("text", "")
            for block in blocks
            if isinstance(block, dict) and isinstance(block.get("text"), str)
        ).strip()

        if not reply:
            LOG.warning("Bedrock returned no text content.")
            return 502, {"error": "The assistant returned no answer. Try again."}
        return 200, {"reply": reply}

    except ClientError as exc:
        error_code = (exc.response.get("Error") or {}).get("Code", "BedrockError")
        LOG.warning("Bedrock request failed: %s", error_code)
        if error_code in ("ThrottlingException", "ServiceUnavailableException", "ModelNotReadyException"):
            return 503, {"error": "The assistant is busy. Please try again shortly."}
        return 502, {"error": "The assistant could not complete that request."}
    except (BotoCoreError, TimeoutError):
        LOG.exception("Bedrock transport error.")
        return 503, {"error": "The assistant is temporarily unavailable."}
    except Exception:
        LOG.exception("Unexpected portfolio chat error.")
        return 500, {"error": "An unexpected error occurred."}
