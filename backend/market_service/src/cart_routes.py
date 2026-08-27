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
from .config import settings

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
    # todo: make sure the requestor isnt the vendor of the listing item
    cart_id = session_storage.getCartIdFromSession(session_id)
    if not cart_id:
        cart_id = session_storage.makeNewCartForSession(session_id)
    session_storage.addItemToSessionCart(session_id, listing_id)
    print(session_storage.session_storage_client.get(session_id))

@cart_router.post("/cart/remove_item/{listing_id}")
async def remove_item_from_cart(listing_id:int, session_id:str=Cookie(None), session_storage=Depends(get_sessions)):
    if not session_id:
        raise HTTPException(status_code=401)
    session_storage.removeItemFromSessionCart(session_id, listing_id)

class ShippingDetails(BaseModel):
    details: str
    shipping_options: dict = {}

@cart_router.post("/cart/shipping_details/add")
async def add_shipping_details(request:ShippingDetails, response:Response, session_id:str=Cookie(None), session_storage=Depends(get_sessions), sql_client=Depends(get_db)):
    if not session_id:
        raise HTTPException(status_code=401)
    cart_id = session_storage.getCartIdFromSession(session_id)
    if not cart_id:
        cart_id = session_storage.makeNewCartForSession(session_id)
    session_storage.updateCartShippingData(session_id, request.details)
    session_storage.updateCartShippingOptions(session_id, request.shipping_options)
    return 200

@cart_router.post("/cart/checkout")
async def checkout(session_id:str=Cookie(None), session_storage=Depends(get_sessions), sql_client=Depends(get_db)):
    cart = session_storage.getCartFromSession(session_id)
    if not cart:
        return
    # make sure shipping details have been attached to the cart
    print("cart", cart)
    shipping_data = cart.get("shipping_data")
    if not shipping_data:
        return 300
    shipping_options = cart.get("shipping_options", {})
    # get the total cost of the cart
    async with sql_client.cursor() as cur:
        # get the total value of the cart
        cart_total = 0
        vendor_username = None
        for item in cart["items"]:
            await cur.execute("SELECT vendor, price_xnv, quantity_available FROM listings WHERE listing_id = %s", (item))
            listing_record = await cur.fetchone()
            cart_total += float((listing_record)["price_xnv"])
            # for now, assert that all order items in a listing come from the same vendor
            if not vendor_username:
                vendor_username = listing_record["vendor"]
            elif vendor_username != listing_record["vendor"]:
                return 505
            if int(listing_record["quantity_available"]) <= 0:
                return 600
    # create an invoice for the cart order
    invoice_create_response = requests.post(f"{settings.PAYMENTS_BASE_URL}/invoice/create", json={"amount": cart_total})
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
            # Get the shipping option ID for this item
            option_id = shipping_options.get(str(order_item))
            if option_id:
                await cur.execute("INSERT INTO order_shipping (order_id, shipping_note, option_id) VALUES (%s, %s, %s)", (order_id, shipping_data, option_id))
            else:
                # If no option selected, use a default or handle error - TODO: revisit this
                await cur.execute("INSERT INTO order_shipping (order_id, shipping_note, option_id) VALUES (%s, %s, %s)", (order_id, shipping_data, 0))
        # decrement the quantity available
        await cur.execute("UPDATE listings SET quantity_available=quantity_available-1 WHERE listing_id IN (SELECT item_listing_id as listing_id FROM order_items WHERE order_id=%s)", (order_id))
    return invoice_create_response.json()