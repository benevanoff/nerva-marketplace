import os
import uuid
import logging
from pydantic import BaseModel

from fastapi import FastAPI, Request, Depends, HTTPException, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware

from .user_routes import router as user_router
from .market_routes import market_router
from .cart_routes import cart_router
from .order_routes import orders_router

app = FastAPI()

# CORS
origins = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://192.168.1.167:3000",
    "http://192.168.1.157:3000"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
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