
from loguru import logger

from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContextFrame
from pipecat.processors.frame_processor import FrameDirection
from pipecat.services.llm_service import FunctionCallParams
from pipecat.services.openai.llm import OpenAILLMContext

class IntakeProcessor:
    def __init__(self, context: OpenAILLMContext):
        print(f"Initializing context from IntakeProcessor")
        context.set_tools(
            [
                {
                    "type": "function",
                    "function": {
                        "name": "greet_and_ask_mood",
                        "description": "Greet the user and ask them to describe their current mood, such as happy, sad, stressed, etc.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "mood": {
                                    "type": "string",
                                    "description": "The user's current mood",
                                }
                            },
                        },
                    },
                }
            ]
        )

    async def greet_and_ask_mood(self, params: FunctionCallParams):
        # Move to empathy step
        params.context.set_tools(
            [
                {
                    "type": "function",
                    "function": {
                        "name": "encourage_sharing",
                        "description": "Encourage the user to share more about why they feel this way.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "reason": {
                                    "type": "string",
                                    "description": "The reason for the user's mood",
                                }
                            },
                        },
                    },
                }
            ]
        )
        await params.result_callback(
            [
                {
                    "role": "system",
                    "content": "Thank you for sharing your mood with me. Would you like to tell me more about why you feel this way? I'm here to listen!",
                }
            ]
        )

    async def encourage_sharing(self, params: FunctionCallParams):
        # Move to suggestion/comfort step
        params.context.set_tools(
            [
                {
                    "type": "function",
                    "function": {
                        "name": "offer_comfort",
                        "description": "Offer comfort, encouragement, or a gentle suggestion based on the user's mood and reason.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "suggestion": {
                                    "type": "string",
                                    "description": "Comforting words or a suggestion for the user",
                                }
                            },
                        },
                    },
                }
            ]
        )
        await params.result_callback(
            [
                {
                    "role": "system",
                    "content": "Thank you for opening up to me. Would you like to hear some encouragement or a suggestion from me?",
                }
            ]
        )

    async def offer_comfort(self, params: FunctionCallParams):
        # Move to end conversation step
        params.context.set_tools(
            [
                {
                    "type": "function",
                    "function": {
                        "name": "gentle_goodbye",
                        "description": "Gently end the conversation or ask if the user wants to talk about something else.",
                        "parameters": {},
                    },
                }
            ]
        )
        await params.result_callback(
            [
                {
                    "role": "system",
                    "content": "I hope my words can bring you some comfort. If you'd like to talk about anything else, just let me know!",
                }
            ]
        )

    async def gentle_goodbye(self, params: FunctionCallParams):
        params.context.set_tools([])
        await params.result_callback(
            [
                {
                    "role": "system",
                    "content": "It was lovely chatting with you. I hope you have a wonderful day! If you ever want to talk, I'm always here.",
                }
            ]
        )

    async def save_data(self, args, result_callback):
        logger.info(f"!!! Saving data: {args}")
        # Since this is supposed to be "async", returning None from the callback
        # will prevent adding anything to context or re-prompting
        await result_callback(None)

