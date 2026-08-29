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

orders_router = APIRouter()

@orders_router.get("/vendor/orders")
async def get_vendor_orders(session_id:str=Cookie(None), session_storage=Depends(get_sessions), sql_client=Depends(get_db),):
    if not session_id:
        raise HTTPException(status_code=401)
    username = session_storage.getUserFromSession(session_id)
    if not username:
        raise HTTPException(status_code=422)
    # todo: assert that the requestor is a vendor
    async with sql_client.cursor() as cur:
        await cur.execute("SELECT * FROM orders WHERE vendor=%s", (username))
        vendor_orders = await cur.fetchall()
    result = []
    for order in vendor_orders:
        order_invoice_details = requests.get(f"{settings.PAYMENTS_BASE_URL}/invoice/{order['invoice_id']}")
        invoice_status = order_invoice_details.json()['status']
        order['status'] = invoice_status
        order['create_time'] = order['create_time'].strftime("%Y-%m-%d %H:%M:%S")

        shipping_status = 'pending'
        async with sql_client.cursor() as cur:
            await cur.execute("SELECT shipping_status FROM order_shipping WHERE order_id=%s", (order['order_id']))
            shipping = await cur.fetchone()
            if shipping:
                shipping_status = shipping['shipping_status']

        result.append({
            "order_id": order['order_id'],
            "create_time": order['create_time'],
            "amount": order_invoice_details.json()['amount'],
            "status": invoice_status,
            "shipping_status": shipping_status
        })
    return result

@orders_router.get("/customer/orders")
async def get_customer_orders(session_id:str=Cookie(None), session_storage=Depends(get_sessions), sql_client=Depends(get_db),):
    if not session_id:
        raise HTTPException(status_code=401)
    username = session_storage.getUserFromSession(session_id)
    if not username:
        raise HTTPException(status_code=422)
    # todo: assert that the requestor is not a vendor ? - visit whether vendors should be able to buy at all
    async with sql_client.cursor() as cur:
            await cur.execute("SELECT * FROM orders WHERE buyer=%s", (username))
            buyer_orders = await cur.fetchall()
            result = []
            for order in buyer_orders:
                order_invoice_details = requests.get(f"{settings.PAYMENTS_BASE_URL}/invoice/{order['invoice_id']}")
                order['invoice_status'] = order_invoice_details.json()['status']
                order['create_time'] = order['create_time'].strftime("%Y-%m-%d %H:%M:%S")
                await cur.execute("SELECT shipping_status FROM order_shipping WHERE order_id=%s", (order['order_id']))
                order['shipping_status'] = (await cur.fetchone())['shipping_status']
                result.append({ "order_id": order['order_id'], "create_time": order['create_time'], "invoice_status": order['invoice_status'], "shipping_status": order['shipping_status'] })
    return result

@orders_router.get("/vendor/orders/{order_id}")
async def get_vendor_order_detail(order_id: int, session_id:str=Cookie(None), session_storage=Depends(get_sessions), sql_client=Depends(get_db),):
    if not session_id:
        raise HTTPException(status_code=401)
    username = session_storage.getUserFromSession(session_id)
    if not username:
        raise HTTPException(status_code=422)
    
    async with sql_client.cursor() as cur:
        # Get order details
        await cur.execute("SELECT * FROM orders WHERE order_id=%s AND vendor=%s", (order_id, username))
        order = await cur.fetchone()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Get order items with listing details
        await cur.execute("""
            SELECT oi.item_listing_id, l.title, l.price_xnv, l.image_name, COUNT(*) as quantity
            FROM order_items oi
            JOIN listings l ON oi.item_listing_id = l.listing_id
            WHERE oi.order_id=%s
            GROUP BY oi.item_listing_id, l.title, l.price_xnv, l.image_name
        """, (order_id,))
        items = await cur.fetchall()
        
        # Get shipping details
        await cur.execute("SELECT shipping_note, shipping_status FROM order_shipping WHERE order_id=%s", (order_id,))
        shipping = await cur.fetchone()
        
        # Get customer details
        await cur.execute("SELECT email FROM users WHERE username=%s", (order['buyer'],))
        customer = await cur.fetchone()
        
        # Get invoice details
        order_invoice_details = requests.get(f"{settings.PAYMENTS_BASE_URL}/invoice/{order['invoice_id']}")
        invoice_data = order_invoice_details.json()
        
        return {
            "order_id": order['order_id'],
            "create_time": order['create_time'].strftime("%Y-%m-%d %H:%M:%S"),
            "status": invoice_data['status'],
            "amount": invoice_data['amount'],
            "customer_username": order['buyer'],
            "customer_email": customer['email'] if customer else None,
            "items": [
                {
                    "listing_id": item['item_listing_id'],
                    "title": item['title'],
                    "price_xnv": float(item['price_xnv']),
                    "image_name": item['image_name'],
                    "quantity": item['quantity']
                }
                for item in items
            ],
            "shipping": {
                "note": shipping['shipping_note'] if shipping else None,
                "status": shipping['shipping_status'] if shipping else None
            }
        }

class ShippingStatusUpdate(BaseModel):
    status: str
@orders_router.put("/vendor/orders/{order_id}/shipping/status")
async def update_vendor_order_shipping_status(
    order_id: int, 
    status_update: ShippingStatusUpdate,
    session_id:str=Cookie(None), 
    session_storage=Depends(get_sessions), 
    sql_client=Depends(get_db)
):
    if not session_id:
        raise HTTPException(status_code=401)
    username = session_storage.getUserFromSession(session_id)
    if not username:
        raise HTTPException(status_code=422)
    
    async with sql_client.cursor() as cur:
        # Verify the order belongs to this vendor
        await cur.execute("SELECT * FROM orders WHERE order_id=%s AND vendor=%s", (order_id, username))
        order = await cur.fetchone()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Update the shipping status
        await cur.execute(
            "UPDATE order_shipping SET shipping_status=%s WHERE order_id=%s",
            (status_update.status, order_id)
        )
    
    return {"success": True, "shipping_status": status_update.status}