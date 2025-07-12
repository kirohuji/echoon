from pipecat.transports.network.fastapi_websocket import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import (
    TTSSpeakFrame
)
from pipecat.serializers.protobuf import ProtobufFrameSerializer
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIObserver, RTVIProcessor
from pipecat.services.ai_services import OpenAILLMContext
from bots.minimax.tts import MiniMaxHttpTTSService, MiniMaxTTSService
from pipecat.services.deepseek.llm import DeepSeekLLMService
from pipecat.transcriptions.language import Language
import os
from loguru import logger


async def ws_bot_pipeline(websocket_client):
    ws_transport = FastAPIWebsocketTransport(
        websocket=websocket_client,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            vad_analyzer=SileroVADAnalyzer(),
            serializer=ProtobufFrameSerializer(),
        ),
    )


    llm = DeepSeekLLMService(
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        model="deepseek-chat",
    )

    context = OpenAILLMContext(
        [
            {
                "role": "user",
                "content": "Start by greeting the user warmly and introducing yourself.",
            }
        ],
    )
    context_aggregator = llm.create_context_aggregator(context)

    tts = MiniMaxHttpTTSService(
        api_key=os.getenv("MINIMAX_API_KEY"),
        group_id=os.getenv("MINIMAX_GROUP_ID"),
        model="speech-01-turbo",
        voice_id="Chinese (Mandarin)_Cute_Spirit",
        sample_rate=24000,
        params=MiniMaxHttpTTSService.InputParams(language=Language.ZH),
    )
    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))
    pipeline = Pipeline(
        [
            ws_transport.input(),
            context_aggregator.user(),
            rtvi,
            llm,  # LLM
            tts,
            ws_transport.output(),
            context_aggregator.assistant(),
        ]
    )
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[RTVIObserver(rtvi)],
    )

    @rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        logger.info("Pipecat client ready.")
        await rtvi.set_bot_ready()
        # Kick off the conversation.
        await task.queue_frames([context_aggregator.user().get_context_frame()])

    @rtvi.event_handler("on_client_message")
    async def on_client_message(rtvi, msg):
        print("RTVI client message:", msg.type, msg.data)
        if msg.type == "tts":
            await task.queue_frames([TTSSpeakFrame(text=msg.data.get("text", ""))])

    @ws_transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Pipecat Client connected")

    @ws_transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Pipecat Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)



