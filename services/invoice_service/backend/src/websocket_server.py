import asyncio
import websockets
import pika
import time
from pika.adapters.asyncio_connection import AsyncioConnection

clients = set()  # Set to keep track of connected WebSocket clients
time.sleep(12)
async def websocket_handler(websocket, path=None):
    clients.add(websocket)
    try:
        # Wait for the websocket connection to close
        await websocket.wait_closed()
    finally:
        clients.remove(websocket)

async def broadcast(message):
    print("broadcast")
    # Send the message to all connected WebSocket clients
    if clients:  # Check if there are any connected clients
        print("broadcast clients", message)
        # Await all send operations
        await asyncio.gather(*(client.send(message) for client in clients))

class RabbitMQConsumer:
    def __init__(self, loop):
        self.loop = loop
        self.connection = None

    def on_rabbit_message(self, channel, method, properties, body):
        message = body.decode()
        asyncio.run_coroutine_threadsafe(broadcast(message), self.loop)
        channel.basic_ack(delivery_tag=method.delivery_tag)

    def on_channel_open(self, channel):
        channel.queue_declare(queue='tx_notifications', durable=False)
        channel.basic_consume(queue='tx_notifications', on_message_callback=self.on_rabbit_message)

    def on_open_connection(self, connection):
        self.connection = connection
        connection.channel(on_open_callback=self.on_channel_open)

    def setup(self):
        parameters = pika.ConnectionParameters('rabbitmq', credentials=pika.PlainCredentials('user', 'passwordkkjhgq'))
        AsyncioConnection(parameters, on_open_callback=self.on_open_connection, custom_ioloop=self.loop)

async def main():
    loop = asyncio.get_event_loop()
    consumer = RabbitMQConsumer(loop)
    consumer.setup()

    # Setup WebSocket Server
    async with websockets.serve(websocket_handler, "0.0.0.0", 8765):
        await asyncio.Future()  # Run indefinitely

asyncio.run(main())
