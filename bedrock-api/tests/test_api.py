import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import core  # noqa: E402
from ratelimit import RateLimiter  # noqa: E402


class NormaliseMessagesTests(unittest.TestCase):
    def test_merges_adjacent_roles(self):
        out = core._normalise_messages([
            {"role": "user", "content": "a"}, {"role": "user", "content": "b"},
        ])
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["content"][0]["text"], "a\nb")

    def test_rejects_assistant_last(self):
        with self.assertRaises(ValueError):
            core._normalise_messages([
                {"role": "user", "content": "a"}, {"role": "assistant", "content": "b"},
            ])

    def test_rejects_overlong_message(self):
        with self.assertRaises(ValueError):
            core._normalise_messages([{"role": "user", "content": "x" * (core.MAX_MESSAGE_CHARS + 1)}])

    def test_output_tokens_are_capped(self):
        self.assertLessEqual(core.MAX_OUTPUT_TOKENS, 8192)
        self.assertGreaterEqual(core.MAX_OUTPUT_TOKENS, 512)

    def test_long_assistant_history_is_truncated_not_rejected(self):
        out = core._normalise_messages([
            {"role": "user", "content": "a"},
            {"role": "assistant", "content": "x" * 5000},
            {"role": "user", "content": "b"},
        ])
        self.assertEqual(len(out[1]["content"][0]["text"]), core.MAX_MESSAGE_CHARS)


class ChatReplyTests(unittest.TestCase):
    def _chat(self, response):
        from unittest import mock
        client = mock.Mock()
        client.converse.return_value = response
        with mock.patch.dict("os.environ", {"AWS_ACCESS_KEY_ID": "x", "AWS_SECRET_ACCESS_KEY": "y"}), \
                mock.patch.object(core.boto3, "client", return_value=client):
            return core.chat({"messages": [{"role": "user", "content": "hi"}]})

    def test_ignores_reasoning_blocks(self):
        status, body = self._chat({"stopReason": "end_turn", "output": {"message": {"content": [
            {"reasoningContent": {"reasoningText": {"text": "thinking"}}}, {"text": "Answer"}]}}})
        self.assertEqual((status, body["reply"]), (200, "Answer"))

    def test_truncated_reply_is_flagged(self):
        status, body = self._chat({"stopReason": "max_tokens", "output": {"message": {"content": [{"text": "Partial"}]}}})
        self.assertEqual(status, 200)
        self.assertIn("cut short", body["reply"])

    def test_all_reasoning_truncation_is_an_error(self):
        status, body = self._chat({"stopReason": "max_tokens", "output": {"message": {"content": [
            {"reasoningContent": {"reasoningText": {"text": "thinking"}}}]}}})
        self.assertEqual(status, 502)


class RateLimiterTests(unittest.TestCase):
    def test_blocks_after_limit_and_recovers(self):
        now = [0.0]
        limiter = RateLimiter(2, 60, 100, clock=lambda: now[0])
        self.assertTrue(limiter.allow("ip"))
        self.assertTrue(limiter.allow("ip"))
        self.assertFalse(limiter.allow("ip"))
        self.assertTrue(limiter.allow("other"))
        now[0] = 61
        self.assertTrue(limiter.allow("ip"))

    def test_global_cap(self):
        limiter = RateLimiter(5, 60, 2, clock=lambda: 0.0)
        self.assertTrue(limiter.allow("a"))
        self.assertTrue(limiter.allow("b"))
        self.assertFalse(limiter.allow("c"))


if __name__ == "__main__":
    unittest.main()
