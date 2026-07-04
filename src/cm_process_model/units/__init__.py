"""Unit operation base class."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from cm_process_model.streams import Stream


class UnitOperation(ABC):
    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config

    @abstractmethod
    def run(self, feed: Stream) -> Stream:
        """Transform an incoming stream and return the outlet stream."""
