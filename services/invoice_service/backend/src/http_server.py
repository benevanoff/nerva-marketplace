import os
import uuid
import logging
from pydantic import BaseModel

from fastapi import FastAPI, Request, Depends, HTTPException, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware

from .dependencies import get_db

from nerva.wallet_rpc import WalletRPC

app = FastAPI()

# CORS
origins = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://192.168.1.167:3000"
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

class InvoiceCreateRequest(BaseModel):
    amount: float
@app.post("/invoice/create")
async def create_invoice(request:InvoiceCreateRequest, sql_client=Depends(get_db)):
    wallet = WalletRPC(host="nerva", port=28082)
    address = (await wallet.create_address(account_index=0))['result']['address']
    async with sql_client.cursor() as cur:
        # make the record the invoice in the database
        await cur.execute("INSERT INTO invoices (amount, address) VALUES (%s, %s)", (request.amount, address))
        invoice_id = cur.lastrowid
    return {"address": address, "invoice_id": invoice_id}

@app.get("/invoice/{invoice_id}")
async def get_invoice(invoice_id:str, sql_client=Depends(get_db)):
    async with sql_client.cursor() as cur:
        await cur.execute("SELECT * FROM invoices WHERE invoice_id=%s", (invoice_id))
        invoice = await cur.fetchone()
    return invoice