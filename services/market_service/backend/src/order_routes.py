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
        order_invoice_details = requests.get(f"http://payments_rest_microservices:8002/invoice/{order['invoice_id']}")
        print(order_invoice_details.json())
        order['status'] = order_invoice_details.json()['status']
        order['create_time'] = order['create_time'].strftime("%Y-%m-%d %H:%M:%S")
        print(order)
        result.append({ "order_id": order['order_id'], "create_time": order['create_time'], "amount": order_invoice_details.json()['amount'], "status": order_invoice_details.json()['status'] })
    return result