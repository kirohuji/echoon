import os
from typing import Any, Dict
from bots.http.bot import http_bot_pipeline
from bots.tts.tts_bot import tts_bot_pipeline
from bots.websocket.bot import ws_bot_pipeline
from bots.types import BotParams, BotConfig
from bots.webrtc.bot import bot_create, bot_launch
from bots.smallwebrtc.bot import smallwebrtc_bot_pipeline
from common.config import DEFAULT_BOT_CONFIG, SERVICE_API_KEYS
# from common.database import default_session_factory
from common.models import Attachment, Conversation
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, Request, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from webapp import get_db
from bots.lesson.tts_bot import lesson_tts_bot_pipeline
import aiohttp

from pipecat.transports.network.webrtc_connection import IceServer, SmallWebRTCConnection

# Store connections by pc_id
pcs_map: Dict[str, SmallWebRTCConnection] = {}

ice_servers = [
    IceServer(
        urls="stun:stun.l.google.com:19302",
    )
]

router = APIRouter(prefix="/bot")


@router.post("/action", response_class=StreamingResponse)
async def stream_action(
    params: BotParams,
) -> StreamingResponse:
    """
    Single-turn HTTP action endpoint.

    This endpoint initiates a streaming response and returns chunks of the bot's
    response in real-time using server-sent events.

    Args:
        params (BotParams): Parameters for the bot interaction, must include:
            - conversation_id: UUID of the conversation to process
            - attachments: List of attachment IDs to include in the bot's response

    Returns:
        StreamingResponse: A streaming response with media type "text/event-stream"
            containing the bot's response chunks.

    Raises:
        HTTPException (400): When conversation_id is missing from params.
        HTTPException (404): When the specified conversation is not found.
        HTTPException (400): When service validation fails (via _validate_services).

    Flow:
        1. Validates the presence of conversation_id
        2. Checks if the conversation exists in the database
        3. Retrieves conversation history
        4. Validates bot services configuration
        5. Runs the bot pipeline and streams the response
    """
    if not params.conversation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing conversation_id in params",
        )

    conversation = None

    # Early exit check that conversation exists before initiating a stream response
    # async with default_session_factory() as db:
    #     conversation = await Conversation.get_conversation_by_id(params.conversation_id, db)
    #     if conversation is None:
    #         raise HTTPException(
    #             status_code=status.HTTP_404_NOT_FOUND,
    #             detail=f"Conversation {params.conversation_id} not found",
    #         )

    config = DEFAULT_BOT_CONFIG

    attachments = []

    async def generate():
        messages = [
            {
                "role": "system",
                "content": params.bot_prompt
            },
        ]
        # Run the single turn pipeline and yield text frames
        gen, task = await http_bot_pipeline(params, config, messages, attachments)
        async for chunk in gen:
            yield chunk
        await task

    return StreamingResponse(generate(), media_type="text/event-stream")

@router.post("/tts", response_class=StreamingResponse)
async def tts(
    params: BotParams,
) -> StreamingResponse:
    config = DEFAULT_BOT_CONFIG
    async def generate():
        gen, task = await tts_bot_pipeline(params, config)
        async for chunk in gen:
            yield chunk
        await task
    return StreamingResponse(generate(), media_type="text/event-stream")

@router.post("/lesson/tts", response_class=StreamingResponse)
async def lesson_tts(
    params: BotParams,
) -> StreamingResponse:
    config = DEFAULT_BOT_CONFIG
    session = aiohttp.ClientSession()
    async def generate():
        gen, task = await lesson_tts_bot_pipeline(params, config, session)
        async for chunk in gen:
            yield chunk
        await task
    return StreamingResponse(generate(), media_type="text/event-stream")

@router.get("/download")
async def download_audio(filename: str):
    file_path = os.path.join("recordings", f"{filename}_conversation_recording.wav")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="audio/mpeg", filename=f"{filename}_conversation_recording.wav")

@router.post("/connect", response_class=JSONResponse)
async def connect(
    params: BotParams,
    # config: BotConfig,
    db: AsyncSession = Depends(get_db),
):
    default_config = DEFAULT_BOT_CONFIG

    # Check which bot profile is requested and return a valid auth bundle to the RTVI client.

    # To support client transports such as Gemini that connect directly via the client,
    # we just return a 200 OK response with the service key.
    # Note: this is not recommended for production as it exposes the API key.
    if params.bot_profile == "voice-to-voice":
        return JSONResponse({"success": True})

    if not params.conversation_id:
        logger.error("No conversation ID passed to connect")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing conversation_id in params",
        )

    logger.debug(f"Starting voice bot for conversation {params.conversation_id}")

    # Check that the conversation exists before proceeding
    conversation = await Conversation.get_conversation_by_id(params.conversation_id, db)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {params.conversation_id} not found",
        )

    # Check that we have a valid daily API key
    transport_api_key = SERVICE_API_KEYS["daily"]

    if not transport_api_key:
        logger.error("Missing API key for transport service")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Missing API key for transport service",
        )

    room, user_token, bot_token = await bot_create(transport_api_key)

    # merged_config = merge_bot_config(default_config, config)

    # print(f"merged_config: {merged_config}")

    bot_launch(params, default_config, room.url, bot_token)

    return JSONResponse(
        {
            "room_name": room.name,
            "room_url": room.url,
            "token": user_token,
        }
    )




@router.post("/connect_ws")
async def bot_connect_ws(request: Request) -> Dict[Any, Any]:
    ws_url = "ws://localhost:7860/ws"
    return {"ws_url": ws_url}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connection accepted")
    try:
        await ws_bot_pipeline(websocket)
    except Exception as e:
        print(f"Exception in run_bot: {e}")

@router.post("/offer")
async def offer(request: dict, background_tasks: BackgroundTasks):
    pc_id = request.get("pc_id")

    if pc_id and pc_id in pcs_map:
        pipecat_connection = pcs_map[pc_id]
        logger.info(f"Reusing existing connection for pc_id: {pc_id}")
        await pipecat_connection.renegotiate(
            sdp=request["sdp"], type=request["type"], restart_pc=request.get("restart_pc", False)
        )
    else:
        pipecat_connection = SmallWebRTCConnection(ice_servers)
        await pipecat_connection.initialize(sdp=request["sdp"], type=request["type"])

        @pipecat_connection.event_handler("closed")
        async def handle_disconnected(webrtc_connection: SmallWebRTCConnection):
            logger.info(f"Discarding peer connection for pc_id: {webrtc_connection.pc_id}")
            pcs_map.pop(webrtc_connection.pc_id, None)

        background_tasks.add_task(smallwebrtc_bot_pipeline, pipecat_connection)

    answer = pipecat_connection.get_answer()
    # Updating the peer connection inside the map
    pcs_map[answer["pc_id"]] = pipecat_connection
    return answer

def merge_bot_config(default_config: BotConfig, override_config: BotConfig) -> BotConfig:
    merged = default_config.dict()
    override = override_config.dict(exclude_unset=True)
    merged.update(override)
    return BotConfig(**merged)
