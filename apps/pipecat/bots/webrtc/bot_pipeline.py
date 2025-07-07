from typing import Any

from bots.persistent_context import PersistentContext
from bots.rtvi import create_rtvi_processor
from bots.types import BotCallbacks, BotConfig, BotParams
from common.config import SERVICE_API_KEYS
from common.models import Conversation, Message
from loguru import logger
from openai._types import NOT_GIVEN
from sqlalchemy.ext.asyncio import AsyncSession
import os
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.processors.user_idle_processor import UserIdleProcessor
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.pipeline.pipeline import Pipeline
from pipecat.frames.frames import (
    LLMMessagesAppendFrame,
    TTSSpeakFrame
)
from pipecat.processors.frame_processor import FrameDirection
from pipecat.services.deepgram.tts import DeepgramTTSService
from pipecat.processors.frameworks.rtvi import (
    ActionResult,
    RTVIAction,
    RTVIActionArgument,
    RTVIProcessor,
)
from pipecat.transcriptions.language import Language
# from pipecat.processors.frameworks.rtvi import (
#     RTVIBotLLMProcessor,
#     RTVIBotTranscriptionProcessor,
#     RTVIBotTTSProcessor,
#     RTVISpeakingProcessor,
#     RTVIUserTranscriptionProcessor,
# )
from pipecat.services.ai_services import OpenAILLMContext
from pipecat.services.gemini_multimodal_live.gemini import (
    GeminiMultimodalLiveLLMService,
    GeminiMultimodalModalities,
    InputParams,
)
from pipecat.transports.services.daily import DailyParams, DailyTransport
from pipecat.services.deepseek.llm import DeepSeekLLMService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.deepgram.tts import DeepgramTTSService
from bots.minimax.tts import MiniMaxHttpTTSService, MiniMaxTTSService
# from pipecat.services.cartesia.tts import CartesiaTTSService
from bots.cartesia.tts import CartesiaTTSEmotionService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
# from pipecat.services.neuphonic.tts import NeuphonicTTSService
from bots.fish.tts import FishAudioTTSService
from bots.hume.tts.HumeTTSService import HumeTTSService
from bots.intake_processor import IntakeProcessor
from bots.emotion_processor import EmotionProcessor
import aiohttp

def extract_role_and_text(msg):
    role = getattr(msg, "role", "")
    content = getattr(msg, "content", "")
    if isinstance(content, list) and len(content) > 0 and isinstance(content[0], dict) and content[0].get('type') == 'text':
        content = content[0].get('text', '')
    return {"role": role, "content": content}
    
def get_main_service(params: BotParams, minimax_session=None):
    stt = None
    llm_rt = None
    tts = None
    instructions = params.bot_prompt
    if instructions is None:
        instructions = "You are a helpful assistant. You are talking to a user who is feeling down. You are trying to help them feel better. You only speak in English."
    model = params.bot_model
    if model is None:
        model = "gemini2_minimax"
    if model == "gemini2":
        llm_rt = GeminiMultimodalLiveLLMService(
            api_key=str(SERVICE_API_KEYS["gemini"]),
            voice_id="Charon",
            system_instruction=instructions,
            transcribe_user_audio=True,
            transcribe_model_audio=True,
            inference_on_context_initialization=False,
        )
    elif model == "gemini2_elevenlabs":
        llm_rt = GeminiMultimodalLiveLLMService(
            api_key=str(SERVICE_API_KEYS["gemini"]),
            voice_id="Aoede",
            transcribe_user_audio=True,
            transcribe_model_audio=True,
            system_instruction=instructions,
            params=InputParams(modalities=GeminiMultimodalModalities.TEXT),
        )
        if ElevenLabsTTSService:
            tts = ElevenLabsTTSService(api_key=os.getenv("ELEVENLABS_API_KEY"), voice_id="cgSgspJ2msm6clMCkdW9")
    elif model == "gemini2_deepgram":
        llm_rt = GeminiMultimodalLiveLLMService(
            api_key=str(SERVICE_API_KEYS["gemini"]),
            system_instruction=instructions,
            voice_id="Aoede",
            transcribe_user_audio=True,
            transcribe_model_audio=True,
            params=InputParams(modalities=GeminiMultimodalModalities.TEXT),
        )
        tts = DeepgramTTSService(api_key=os.getenv("DEEPGRAM_API_KEY"), voice="aura-2-andromeda-en")
    elif model == "gemini2_hume":
        llm_rt = GeminiMultimodalLiveLLMService(
            api_key=str(SERVICE_API_KEYS["gemini"]),
            system_instruction=instructions,
            voice_id="Aoede",
            params=InputParams(modalities=GeminiMultimodalModalities.TEXT),
        )
        tts = HumeTTSService(api_key=os.getenv("HUME_API_KEY"))
    elif model == "gemini2_cartesia":
        llm_rt = GeminiMultimodalLiveLLMService(
            api_key=str(SERVICE_API_KEYS["gemini"]),
            system_instruction=instructions,
            voice_id="Aoede",
            transcribe_user_audio=True,
            transcribe_model_audio=True,
            params=InputParams(modalities=GeminiMultimodalModalities.TEXT),
        )
        tts = CartesiaTTSEmotionService(api_key=os.getenv("CARTESIA_API_KEY"), model="sonic-turbo-2025-03-07", voice_id="f786b574-daa5-4673-aa0c-cbe3e8534c02")
    elif model == "gemini2_neuphonic":
        llm_rt = GeminiMultimodalLiveLLMService(
            api_key=str(SERVICE_API_KEYS["gemini"]),
            system_instruction=instructions,
            voice_id="Aoede",
            params=InputParams(modalities=GeminiMultimodalModalities.TEXT),
        )
        tts = NeuphonicHttpTTSService(api_key=os.getenv("NEUPHONIC_API_KEY"), voice_id="196867bb-cf33-4764-b2f1-0035bb470147",)
    elif model == "gemini2_minimax":
        llm_rt = GeminiMultimodalLiveLLMService(
            api_key=str(SERVICE_API_KEYS["gemini"]),
            system_instruction=instructions,
            transcribe_user_audio=True,
            transcribe_model_audio=True,
            voice_id="Aoede",
            params=InputParams(modalities=GeminiMultimodalModalities.TEXT),
        )
        tts = MiniMaxHttpTTSService(
            api_key=os.getenv("MINIMAX_API_KEY"),
            group_id=os.getenv("MINIMAX_GROUP_ID"),
            model="speech-01-turbo",
            voice_id="Chinese (Mandarin)_Cute_Spirit",
            sample_rate=24000,
            params=MiniMaxHttpTTSService.InputParams(language=Language.ZH),
        )
    elif model == "gemini2_fish":
        llm_rt = GeminiMultimodalLiveLLMService(
            api_key=str(SERVICE_API_KEYS["gemini"]),
            system_instruction=instructions,
            voice_id="Aoede",
            params=InputParams(modalities=GeminiMultimodalModalities.TEXT),
        )
        if FishAudioTTSService:
            tts = FishAudioTTSService(api_key=os.getenv("FISH_API_KEY"),  model="6717a74323274cb296ea9a0da654c977")
    elif model == "deepgram_deepseek_elevenlabs":
        stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))
        llm_rt = DeepSeekLLMService(api_key=os.getenv("DEEPSEEK_API_KEY"))
        if ElevenLabsTTSService:
            tts = ElevenLabsTTSService(api_key=os.getenv("ELEVENLABS_API_KEY"), voice_id="cgSgspJ2msm6clMCkdW9")
    else:
        raise ValueError(f"Invalid bot model: {params.bot_model}")
    return stt, llm_rt, tts

def get_processors(
    transport: DailyTransport, 
    user_idle: UserIdleProcessor, 
    rtvi: RTVIProcessor, 
    user_aggregator: Any, 
    llm_rt: Any, 
    tts: Any | None, 
    stt: Any | None,
    assistant_aggregator: Any,
    storage: PersistentContext,
    emotion: EmotionProcessor,
):
    processors = [
        transport.input(),
    ]
    if stt:
        processors.append(stt)
    processors.extend([
        user_idle,
        rtvi,
        user_aggregator,
        llm_rt,
        # emotion,
    ])
    if tts:
        processors.append(tts)
    processors.extend([
        transport.output(),
        assistant_aggregator,
        storage.create_processor(exit_on_endframe=True),
    ])
    return processors




async def bot_pipeline(
    params: BotParams,
    config: BotConfig,
    callbacks: BotCallbacks,
    room_url: str,
    room_token: str,
    db: AsyncSession,
) -> Pipeline:
    transport = DailyTransport(
        room_url,
        room_token,
        "Gemini Bot",
        DailyParams(
            camera_out_enabled=True,
            camera_out_width=1024,
            camera_out_height=576,
            video_out_enabled=True,
            video_out_width=1024,
            video_out_height=576,
            video_in_enabled=True,
            audio_in_sample_rate=16000,
            audio_out_enabled=True,
            audio_out_sample_rate=24000,
            transcription_enabled=True,
            vad_enabled=True,
            audio_in_enabled=True,
            audio_in_passthrough=True,
            vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=0.5)),
            vad_audio_passthrough=True,
        ),
    )

    conversation = await Conversation.get_conversation_by_id(params.conversation_id, db)
    if not conversation:
        raise Exception(f"Conversation {params.conversation_id} not found")
    messages = [getattr(msg, "content") for msg in conversation.messages]

    if params.bot_model == "gemini2_minimax":
        async with aiohttp.ClientSession() as minimax_session:
            stt, llm_rt, tts = get_main_service(params, minimax_session)
            return await _bot_pipeline_inner(params, config, callbacks, transport, stt, llm_rt, tts, db, messages)
    else:
        stt, llm_rt, tts = get_main_service(params)
        return await _bot_pipeline_inner(params, config, callbacks, transport, stt, llm_rt, tts, db, messages)

async def _bot_pipeline_inner(params, config, callbacks, transport, stt, llm_rt, tts, db, messages):
    tools = NOT_GIVEN  # todo: implement tools in and set here
    context_rt = OpenAILLMContext(messages, tools)

    context_aggregator_rt = llm_rt.create_context_aggregator(context_rt)

    user_aggregator = context_aggregator_rt.user()

    assistant_aggregator = context_aggregator_rt.assistant()

    storage = PersistentContext(context=context_rt)

    intake = IntakeProcessor(context_rt)
    llm_rt.register_function("greet_and_ask_mood", intake.greet_and_ask_mood)
    llm_rt.register_function("encourage_sharing", intake.encourage_sharing)
    llm_rt.register_function("offer_comfort", intake.offer_comfort)
    llm_rt.register_function("gentle_goodbye", intake.gentle_goodbye)

    rtvi = await create_rtvi_processor(config, user_aggregator)

    async def handle_user_idle(user_idle: UserIdleProcessor, retry_count: int) -> bool:
        print("间隔时间已经超过5秒了")
        if retry_count == 1:
            idleMessage = [
                {
                    "role": "system",
                     "content": "The user has been quiet. Politely and briefly ask if they're still there.",
                },
                {
                     "role": "user",
                     "content": ""
                }]
            # messages.append(idleMessage)
            await user_idle.push_frame(LLMMessagesAppendFrame(messages=idleMessage))
            return True
        elif retry_count == 2:
            idleMessage = [
                {
                    "role": "system",
                     "content": "The user is still inactive. Ask if they'd like to continue our conversation.",
                },
                {
                     "role": "user",
                     "content": ""
                }]
            # messages.append(idleMessage)
            await user_idle.push_frame(LLMMessagesAppendFrame(messages=idleMessage))
            return True
        else:
            # Third attempt: End the conversation
            await user_idle.push_frame(
                TTSSpeakFrame("It seems like you're busy right now. Have a nice day!")
            )
            # await task.queue_frame(EndFrame())
            return False

    user_idle = UserIdleProcessor(
        callback=handle_user_idle,
        timeout=8.0
    )

    emotion = EmotionProcessor()

    processors = get_processors(transport, user_idle, rtvi, user_aggregator, llm_rt, tts, stt, assistant_aggregator, storage, emotion)

    pipeline = Pipeline(processors)

    @storage.on_context_message
    async def on_context_message(messages: list[Any]):
        logger.debug(f"{len(messages)} message(s) received for storage")
        try:
            await Message.create_messages(
                db_session=db, conversation_id=params.conversation_id, messages=messages
            )
        except Exception as e:
            logger.error(f"Error storing messages: {e}")
            raise e

    @rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        await rtvi.set_bot_ready()
        for message in params.actions:
            await rtvi.handle_message(message)

    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport, participant):
        # Enable both camera and screenshare. From the client side
        # send just one.
        await transport.capture_participant_video(
            participant["id"], framerate=1, video_source="camera"
        )
        await transport.capture_participant_video(
            participant["id"], framerate=1, video_source="screenVideo"
        )
        await callbacks.on_first_participant_joined(participant)

    @transport.event_handler("on_participant_joined")
    async def on_participant_joined(transport, participant):
        await callbacks.on_participant_joined(participant)

    @transport.event_handler("on_participant_left")
    async def on_participant_left(transport, participant, reason):
        await callbacks.on_participant_left(participant, reason)

    @transport.event_handler("on_call_state_updated")
    async def on_call_state_updated(transport, state):
        await callbacks.on_call_state_updated(state)

    return pipeline, rtvi
