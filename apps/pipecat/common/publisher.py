# publisher.py
import pika

class PublisherFactory:
    _instance = None
    _connection = None
    _channel = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PublisherFactory, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._connection = pika.BlockingConnection(pika.ConnectionParameters("115.159.95.166"))
        self._channel = self._connection.channel()
        self._channel.queue_declare(queue="pipecat", durable=True)
        self._initialized = True

    @property
    def channel(self):
        return self._channel

    def _ensure_connection(self):
        if self._connection is None or self._connection.is_closed:
            self._connection = pika.BlockingConnection(pika.ConnectionParameters("115.159.95.166"))
        if self._channel is None or self._channel.is_closed:
            self._channel = self._connection.channel()
            self._channel.queue_declare(queue="pipecat", durable=True)

    def publish(self, body: str):
        self._ensure_connection()
        self._channel.basic_publish(
            exchange="",
            routing_key="pipecat",
            body=body,
            properties=pika.BasicProperties(delivery_mode=2)
        )

    def close(self):
        if self._connection:
            self._connection.close()

# 创建一个默认的 publisher 工厂实例
default_publisher_factory = PublisherFactory()

# channel.basic_publish(
#     exchange="",
#     routing_key="pipecat",
#     body="Hello from Python!",
#     properties=pika.BasicProperties(delivery_mode=2)  # 持久化消息
# )

# print(" [x] Sent")
# connection.close()
