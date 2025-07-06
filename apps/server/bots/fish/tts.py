from pipecat.services.fish.tts import FishAudioTTSService, FishAudioOutputFormat
from typing import Optional
from pydantic import BaseModel
from pipecat.transcriptions.language import Language
try:
    import ormsgpack
    import websockets
except ModuleNotFoundError as e:
    logger.error(f"Exception: {e}")
    logger.error("In order to use Fish Audio, you need to `pip install pipecat-ai[fish]`.")
    raise Exception(f"Missing module: {e}")
from loguru import logger

class FishAudioTTSService(FishAudioTTSService):
    class InputParams(BaseModel):
        language: Optional[Language] = Language.EN
        latency: Optional[str] = "normal"  # "normal" or "balanced"
        prosody_speed: Optional[float] = 1.0  # Speech speed (0.5-2.0)
        prosody_volume: Optional[int] = 0  # Volume adjustment in dB

    async def _connect_websocket(self):
        try:
            if self._websocket and self._websocket.open:
                return

            logger.debug("Connecting to Fish Audio")
            headers = {"Authorization": f"Bearer {self._api_key}"}
            self._websocket = await websockets.connect(self._base_url, extra_headers=headers)

            # Send initial start message with ormsgpack
            start_message = {"event": "start", "request": {"text": "", **self._settings}}
            await self._websocket.send(ormsgpack.packb(start_message))
            logger.debug("Sent start message to Fish Audio")
        except Exception as e:
            logger.error(f"Fish Audio initialization error: {e}")
            self._websocket = None
            await self._call_event_handler("on_connection_error", f"{e}")