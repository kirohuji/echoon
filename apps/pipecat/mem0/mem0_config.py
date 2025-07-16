import os
from mem0 import Memory
from dotenv import load_dotenv

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

load_dotenv()  # 加载 .env 文件中的 API key

config = {
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "collection_name": "test",
            "host": "115.159.95.166",
            "port": 6333,
        }
    },
    "llm": {
        "provider": "deepseek",
        "config": {
            "model": "deepseek-chat",  # default model
            "api_key": DEEPSEEK_API_KEY,
            "temperature": 0.2,
            "max_tokens": 2000,
            "top_p": 1.0
        }
    },
    "embedder": {
        "provider": "gemini",
        "config": {
            "model": "models/text-embedding-004",
            "api_key": GOOGLE_API_KEY,
        }
    }
}

memory = Memory.from_config(config)
