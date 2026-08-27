import uuid
import json
import copy
import redis
import aiomysql

from .config import settings

db_config = {
    "host": settings.DB_HOST,
    "user": settings.DB_USER,
    "password": settings.DB_PASS,
    "db": settings.DB_NAME,
    "autocommit": True,
}

async def get_db():
    config = copy.deepcopy(db_config)
    config["cursorclass"] = aiomysql.cursors.DictCursor
    conn = await aiomysql.connect(**config)
    print(config)
    try:
        yield conn
    finally:
        conn.close()

class Sessions:
    def __init__(self):
        self.session_storage_client = redis.StrictRedis(
            host=settings.CACHE_HOST,
            port=settings.CACHE_PORT,
            db=0,
            password=settings.CACHE_PASS,
        )

    def makeNewUserSession(self, username, is_vendor=False):
        session_id = str(uuid.uuid4())
        self.session_storage_client.set(session_id, json.dumps({"username": username, "is_vendor": is_vendor}))
        return session_id

    def getUserFromSession(self, session_id):
        return json.loads(self.session_storage_client.get(session_id).decode())["username"]
    
    def getIsVendorFromSession(self, session_id):
        return json.loads(self.session_storage_client.get(session_id).decode())["is_vendor"]

    def makeNewCartForSession(self, session_id):
        cart = {
            "cart_id": str(uuid.uuid4()),
            "items": []
        }
        current_session_data = json.loads(self.session_storage_client.get(session_id).decode())
        current_session_data["cart"] = cart
        self.session_storage_client.set(session_id, json.dumps(current_session_data))
        return cart["cart_id"]
    
    def getCartIdFromSession(self, session_id):
        cart = json.loads(self.session_storage_client.get(session_id).decode()).get("cart")
        if cart:
            return cart["cart_id"]

    def getCartFromSession(self, session_id):
        return json.loads(self.session_storage_client.get(session_id).decode()).get("cart")

    def addItemToSessionCart(self, session_id, listing_id):
        current_session_data = json.loads(self.session_storage_client.get(session_id).decode())
        current_session_data["cart"]["items"].append(listing_id)
        self.session_storage_client.set(session_id, json.dumps(current_session_data))

    def removeItemFromSessionCart(self, session_id, listing_id):
        current_session_data = json.loads(self.session_storage_client.get(session_id).decode())
        if "cart" in current_session_data and "items" in current_session_data["cart"]:
            current_session_data["cart"]["items"] = [
                item for item in current_session_data["cart"]["items"] if item != listing_id
            ]
            self.session_storage_client.set(session_id, json.dumps(current_session_data))

    def updateCartShippingData(self, session_id, shipping_data):
        current_session_data = json.loads(self.session_storage_client.get(session_id).decode())
        current_session_data["cart"]["shipping_data"] = shipping_data
        self.session_storage_client.set(session_id, json.dumps(current_session_data))

    def updateCartShippingOptions(self, session_id, shipping_options):
        current_session_data = json.loads(self.session_storage_client.get(session_id).decode())
        current_session_data["cart"]["shipping_options"] = shipping_options
        self.session_storage_client.set(session_id, json.dumps(current_session_data))

    def clearCart(self, session_id):
        current_session_data = json.loads(self.session_storage_client.get(session_id).decode())
        del current_session_data["cart"]
        self.session_storage_client.set(session_id, json.dumps(current_session_data))

def get_sessions():
    session_storage = Sessions()
    yield session_storage