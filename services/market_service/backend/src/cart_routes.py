import os
import uuid
import imghdr
import logging
import requests
from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter
from fastapi import FastAPI, Request, Depends, HTTPException, Response, Cookie, File, UploadFile, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .dependencies import get_db, get_sessions

cart_router = APIRouter()

@cart_router.get("/cart/details")
async def get_cart_details(session_id:str=Cookie(None), session_storage=Depends(get_sessions)):
    if not session_id:
        raise HTTPException(status_code=401)
    cart = session_storage.getCartFromSession(session_id)
    if not cart:
        raise HTTPException(status_code=422)
    return cart

@cart_router.post("/cart/add_item/{listing_id}")
async def add_item_to_cart(listing_id:int, session_id:str=Cookie(None), session_storage=Depends(get_sessions)):
    if not session_id:
        raise HTTPException(status_code=401)
    cart_id = session_storage.getCartIdFromSession(session_id)
    if not cart_id:
        cart_id = session_storage.makeNewCartForSession(session_id)
    session_storage.addItemToSessionCart(session_id, listing_id)
    print(session_storage.session_storage_client.get(session_id))

@cart_router.post("/cart/checkout")
async def checkout(session_id:str=Cookie(None), session_storage=Depends(get_sessions), sql_client=Depends(get_db)):
    # get the total cost of the cart
    cart = session_storage.getCartFromSession(session_id)
    if not cart:
        return
    async with sql_client.cursor() as cur:
        # get the total value of the cart
        cart_total = 0
        vendor_username = None
        for item in cart["items"]:
            await cur.execute("SELECT vendor, price_xnv FROM listings WHERE listing_id = %s", (item))
            listing_record = await cur.fetchone()
            cart_total += float((listing_record)["price_xnv"])
            # for now, assert that all order items in a listing come from the same vendor
            if not vendor_username:
                vendor_username = listing_record["vendor"]
            elif vendor_username != listing_record["vendor"]:
                return 505
    # create an invoice for the cart order
    invoice_create_response = requests.post("http://payments_rest_microservices:8002/invoice/create", json={"amount": cart_total})
    # clear the session cart if successful
    assert invoice_create_response.status_code == 200
    session_storage.clearCart(session_id)
    # create an new order record
    buyer_username = session_storage.getUserFromSession(session_id)
    async with sql_client.cursor() as cur:
        await cur.execute("INSERT INTO orders (vendor, buyer, invoice_id) VALUES (%s,%s,%s)", (vendor_username, buyer_username, invoice_create_response.json()["invoice_id"]))
        order_id = cur.lastrowid
        for order_item in cart["items"]:
            await cur.execute("INSERT INTO order_items (order_id, item_listing_id) VALUES (%s,%s)", (order_id, order_item))

    return invoice_create_response.json()