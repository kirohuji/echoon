import os
from mem0 import Memory
from dotenv import load_dotenv

os.environ["DEEPSEEK_API_KEY"] = "sk-63b34fc51c79415a8208c61a38d5edd2"
os.environ["GOOGLE_API_KEY"] = "AIzaSyDnmcknk5rbUI2rTYH0xhUJnIB10y41csg"

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
            "temperature": 0.2,
            "max_tokens": 2000,
            "top_p": 1.0
        }
    },
    "embedder": {
        "provider": "gemini",
        "config": {
            "model": "models/text-embedding-004",
        }
    }
}

memory = Memory.from_config(config)
