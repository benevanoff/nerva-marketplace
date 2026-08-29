import uuid
from pydantic import BaseModel

from fastapi import FastAPI, Request, Depends, HTTPException, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .user_routes import router as user_router
from .market_routes import market_router
from .cart_routes import cart_router
from .order_routes import orders_router

app = FastAPI()

# CORS
origins = settings.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "Set-Cookie"]
)

# route handlers
@app.get("/")
def root():
    return "Hello World"

app.include_router(user_router)
app.include_router(market_router)
app.include_router(cart_router)
app.include_router(orders_router)