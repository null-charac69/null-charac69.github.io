"""Tiny in-memory sliding-window rate limiter (per warm serverless instance)."""

import threading
import time
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int, global_max: int, clock=time.monotonic):
        self.max_requests = max_requests
        self.window = window_seconds
        self.global_max = global_max
        self._clock = clock
        self._hits: dict[str, deque] = defaultdict(deque)
        self._all: deque = deque()
        self._lock = threading.Lock()

    def _prune(self, queue: deque, now: float) -> None:
        while queue and now - queue[0] > self.window:
            queue.popleft()

    def allow(self, key: str) -> bool:
        now = self._clock()
        with self._lock:
            self._prune(self._all, now)
            if len(self._all) >= self.global_max:
                return False
            hits = self._hits[key]
            self._prune(hits, now)
            if len(hits) >= self.max_requests:
                return False
            hits.append(now)
            self._all.append(now)
            if len(self._hits) > 2048:  # bound memory
                for stale in [k for k, q in self._hits.items() if not q or now - q[-1] > self.window]:
                    del self._hits[stale]
            return True
