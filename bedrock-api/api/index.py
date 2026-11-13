"""Single Vercel Python function for Bedrock chat and health checks."""

from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import urlparse

from core import ALLOWED_ORIGIN, MAX_BODY_BYTES, chat
from ratelimit import RateLimiter

# Best-effort, per warm instance: serverless instances do not share memory, so
# this blunts casual abuse but is not a hard quota. Set a monthly AWS Budget
# alert as the real backstop.
LIMITER = RateLimiter(max_requests=10, window_seconds=600, global_max=300)


class handler(BaseHTTPRequestHandler):
    def _send(self, status: int, payload: dict, cors: bool = True) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Vary", "Origin")
        if cors and self.headers.get("Origin") == ALLOWED_ORIGIN:
            self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if self.headers.get("Origin") != ALLOWED_ORIGIN:
            self._send(403, {"error": "Origin not allowed."}, cors=False)
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Vary", "Origin")
        self.end_headers()

    def do_GET(self):
        # The /health route is rewritten to this function by vercel.json.
        self._send(200, {"status": "ok", "provider": "Amazon Bedrock"})

    def do_POST(self):
        # The /chat route is rewritten to this function by vercel.json.
        if self.headers.get("Origin") != ALLOWED_ORIGIN:
            self._send(403, {"error": "Origin not allowed."}, cors=False)
            return

        client_ip = (self.headers.get("X-Forwarded-For", "") or self.client_address[0]).split(",")[0].strip()
        if not LIMITER.allow(client_ip):
            self._send(429, {"error": "Too many requests. Please try again in a few minutes."})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send(400, {"error": "Invalid Content-Length."})
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            self._send(413 if length > MAX_BODY_BYTES else 400, {"error": "Request is empty or too large."})
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("Request body must be a JSON object.")
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
            self._send(400, {"error": "Invalid JSON request body."})
            return

        status, result = chat(payload)
        self._send(status, result)

    def log_message(self, fmt, *args):
        # Do not log request bodies or visitor prompts.
        return
