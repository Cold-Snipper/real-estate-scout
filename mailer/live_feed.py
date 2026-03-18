from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass
from typing import Any, Literal

FeedChannel = Literal["system", "mailer", "athome", "immotop", "whatsapp", "scraper"]
FeedLevel = Literal["debug", "info", "warn", "error"]


def _utc_ts() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


@dataclass
class FeedEvent:
    ts: str
    channel: FeedChannel
    level: FeedLevel
    message: str
    data: dict[str, Any]

    def to_json(self) -> str:
        return json.dumps(
            {
                "ts": self.ts,
                "channel": self.channel,
                "level": self.level,
                "message": self.message,
                "data": self.data or {},
            },
            ensure_ascii=False,
        )


class LiveFeedHub:
    """
    In-process pub/sub hub for live runtime events.

    - `publish` is safe to call from async code.
    - Subscribers get an asyncio.Queue of already-serialized JSON lines.
    """

    def __init__(self, *, max_queue: int = 500, buffer_size: int = 200) -> None:
        self._subs: set[asyncio.Queue[str]] = set()
        self._max_queue = max_queue
        self._buffer_size = buffer_size
        self._buffer: list[str] = []

    def subscribe(self) -> asyncio.Queue[str]:
        q: asyncio.Queue[str] = asyncio.Queue(maxsize=self._max_queue)
        self._subs.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[str]) -> None:
        self._subs.discard(q)

    def publish(self, event: FeedEvent) -> None:
        payload = event.to_json()
        self._buffer.append(payload)
        self._buffer = self._buffer[-self._buffer_size :]
        dead: list[asyncio.Queue[str]] = []
        for q in list(self._subs):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                # Drop oldest by draining 1, then try again (best-effort).
                try:
                    _ = q.get_nowait()
                except Exception:
                    pass
                try:
                    q.put_nowait(payload)
                except Exception:
                    dead.append(q)
            except Exception:
                dead.append(q)
        for q in dead:
            self._subs.discard(q)

    def snapshot(self, *, limit: int = 200) -> list[str]:
        return list(self._buffer[-int(limit) :])


HUB = LiveFeedHub()


def emit(
    channel: FeedChannel,
    message: str,
    *,
    level: FeedLevel = "info",
    **data: Any,
) -> FeedEvent:
    evt = FeedEvent(ts=_utc_ts(), channel=channel, level=level, message=(message or "").strip(), data=data)
    HUB.publish(evt)
    return evt

