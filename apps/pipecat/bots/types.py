from typing import Any, Awaitable, Callable, List, Mapping, Optional

from pipecat.processors.frameworks.rtvi import RTVIMessage, RTVIServiceConfig
from pydantic import BaseModel


class BotConfig(BaseModel):
    services: Mapping[str, str] = {}
    config: List[RTVIServiceConfig] = []


class BotParams(BaseModel):
    conversation_id: str
    actions: List[RTVIMessage] = []
    bot_model: Optional[str] = None
    bot_prompt: Optional[str] = None
    bot_profile: Optional[str] = None
    user_id: Optional[str] = None
    participant_id: Optional[str] = None
    attachments: List[str] = []
    voice_id: Optional[str] = None


class BotCallbacks(BaseModel):
    on_call_state_updated: Callable[[str], Awaitable[None]]
    on_first_participant_joined: Callable[[Mapping[str, Any]], Awaitable[None]]
    on_participant_joined: Callable[[Mapping[str, Any]], Awaitable[None]]
    on_participant_left: Callable[[Mapping[str, Any], str], Awaitable[None]]
