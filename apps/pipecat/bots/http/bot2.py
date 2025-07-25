import asyncio
from typing import Any, AsyncGenerator, List, Tuple
import os
import json
from bots.http.frame_serializer import BotFrameSerializer
from bots.persistent_context import PersistentContext
from common.publisher import PublisherFactory
from bots.rtvi import create_rtvi_processor
from bots.types import BotConfig, BotParams
from common.config import SERVICE_API_KEYS
from common.models import Attachment, Message
from common.publisher import default_publisher_factory
from fastapi import HTTPException, status
from loguru import logger
from openai._types import NOT_GIVEN
from pipecat.services.deepseek.llm import DeepSeekLLMService
from sqlalchemy.ext.asyncio import AsyncSession

from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from pipecat.processors.async_generator import AsyncGeneratorProcessor
from pipecat.processors.frameworks.rtvi import (
    RTVIActionRun,
    RTVIMessage,
    RTVIProcessor,
    RTVIObserver
)
from pipecat.services.ai_services import OpenAILLMContext
from pipecat.services.google import GoogleLLMContext, GoogleLLMService
from langchain_core.chat_history import BaseChatMessageHistory
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_deepseek import ChatDeepSeek
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from pipecat.processors.frameworks.langchain import LangchainProcessor
# from pipecat.services.mem0.memory import Mem0MemoryService


message_store = {}


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in message_store:
        message_store[session_id] = ChatMessageHistory()
    return message_store[session_id]


async def http_bot_pipeline(
    params: BotParams,
    config: BotConfig,
    messages,
    attachments: List[Attachment],
    language_code: str = "english",
) -> Tuple[AsyncGenerator[Any, None], Any]:
    llm_api_key = SERVICE_API_KEYS.get("gemini")
    if llm_api_key is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Service `llm` not available in SERVICE_API_KEYS. Please check your environment variables.",
        )

    # llm = GoogleLLMService(
    #     api_key=str(SERVICE_API_KEYS["gemini"]),
    #     model="gemini-2.0-flash-exp",
    # )

    # llm = DeepSeekLLMService(
    #     api_key=os.getenv("DEEPSEEK_API_KEY"),
    #     model="deepseek-chat",
    # )
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Be nice and helpful. Answer very briefly and without special characters like `#` or `*`. "
                "Your response will be synthesized to voice and those characters will create unnatural sounds.",
            ),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    chain = prompt | ChatDeepSeek(model="deepseek-chat",api_key=os.getenv("DEEPSEEK_API_KEY"))
    history_chain = RunnableWithMessageHistory(
        chain,
        get_session_history,
        history_messages_key="chat_history",
        input_messages_key="input",
    )
    lc = LangchainProcessor(history_chain)

    tools = NOT_GIVEN
    context = OpenAILLMContext(messages, tools)
    context_aggregator = llm.create_context_aggregator(
        context
    )
    # Terrible hack. Fix this by making create_context_aggregator downcast the context
    # automatically. But think through that code first to make sure there won't be
    # any unintended consequences.
    # if isinstance(llm, GoogleLLMService):
    #     GoogleLLMContext.upgrade_to_google(context)
    user_aggregator = context_aggregator.user()
    assistant_aggregator = context_aggregator.assistant()

    storage = PersistentContext(context=context)

    async_generator = AsyncGeneratorProcessor(serializer=BotFrameSerializer())

    #
    # RTVI
    #

    rtvi = await create_rtvi_processor(config, user_aggregator)

    #
    # Processing
    #

    tts = CartesiaTTSService(api_key=os.getenv("CARTESIA_API_KEY"), model="sonic-turbo-2025-03-07", voice_id="f786b574-daa5-4673-aa0c-cbe3e8534c02")
    # memory = Mem0MemoryService(
    #     api_key=os.getenv("MEM0_API_KEY"),  # Your Mem0 API key
    #     user_id=params.user_id,  # Unique identifier for the user
    #     # agent_id="agent1",  # Optional identifier for the agent
    #     # run_id="session1",  # Optional identifier for the run
    #     params=Mem0MemoryService.InputParams(
    #         search_limit=10,
    #         search_threshold=0.3,
    #         api_version="v2",
    #         system_prompt="Based on previous conversations, I recall: \n\n",
    #         add_as_system_message=True,
    #         position=1,
    #     ),
    # )

    processors = [
        rtvi,
        user_aggregator,
        storage.create_processor(),
        lc,
        # memory,
        # tts,
        async_generator,
        assistant_aggregator,
        storage.create_processor(exit_on_endframe=True),
    ]

    pipeline = Pipeline(processors)

    runner = PipelineRunner(handle_sigint=False)

    task = PipelineTask(pipeline, observers=[RTVIObserver(rtvi)])

    runner_task = asyncio.create_task(runner.run(task))

    @storage.on_context_message
    async def on_context_message(messages: list[Any]):
        logger.debug(f"{len(messages)} message(s) received for storage: {str(messages)[:120]}...")
        try:
            default_publisher_factory = PublisherFactory()
            print(params.user_id, params.participant_id)
            payload = {
                "pattern": "message",
                "data": {
                    "user_id": params.user_id,
                    "participant_id": params.participant_id,
                    "language_code": language_code,
                    "conversation_id": params.conversation_id,
                    "messages": messages,
                }
            }
            default_publisher_factory.publish(json.dumps(payload))
        except Exception as e:
            logger.error(f"Error storing messages: {e}")
            raise e

    @rtvi.event_handler("on_bot_started")
    async def on_bot_started(rtvi: RTVIProcessor):
        for action in params.actions:
            logger.debug(f"Processing action: {action}")

            # If this is an append_to_messages action, we need to append any
            # attachments. The rule we'll follow is that we should append
            # attachments to the first "user" message in the actions list.
            if action.data.get("action") == "append_to_messages" and attachments:
                for msg in action.data["arguments"][0]["value"]:
                    if msg.get("role") == "user":
                        # Append attachments to this message
                        logger.debug(
                            f"Appending {len(attachments)} attachment(s) to 'user' message"
                        )
                        content = msg.get("content", "")
                        if isinstance(content, str):
                            content = [{"type": "text", "text": content}]
                        for attachment in attachments:
                            # Assume for the moment that all attachments are images
                            content.append(
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{attachment.file_type};base64,{attachment.file_data}"
                                    },
                                }
                            )
                            # await db.delete(attachment)
                            # await db.commit()
                        break

            await rtvi.handle_message(action)

        # This is a single turn, so we just push an action to stop the running
        # pipeline task.
        action = RTVIActionRun(service="system", action="end")
        message = RTVIMessage(type="action", id="END", data=action.model_dump())
        await rtvi.handle_message(message)

    return (async_generator.generator(), runner_task)
