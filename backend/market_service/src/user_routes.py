import uuid
import logging
import requests
import nacl.pwhash.argon2id
from pydantic import BaseModel
from fastapi import APIRouter
from fastapi import FastAPI, Request, Depends, HTTPException, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .dependencies import get_db, get_sessions
from .config import settings

router = APIRouter()

def hash_password(password:str):
    return nacl.pwhash.argon2id.str(password.encode('utf-8')).decode('utf-8')

# User Registration Routes
class UserRegistrationSubmitRequest(BaseModel):
    email: str
    username: str
    password: str
@router.post("/users/registration/submit")
async def user_registration_submit(req: UserRegistrationSubmitRequest, rds_client=Depends(get_db)):
    activation_secret = str(uuid.uuid4())
    async with rds_client.cursor() as cur:
        await cur.execute("""
            INSERT INTO users
            (username, email, password)
            VALUES (%s, %s, %s)
            """, (req.username, req.email, hash_password(req.password)))
        await cur.execute("""
            INSERT INTO user_validation_tokens
            (token, username)
            VALUES (%s, %s)
            """, (activation_secret, req.username))
    # TODO: send email with verification link
    return 200

@router.post("/users/registration/activate/{activation_token}")
async def user_registration_activate(activation_token:str, rds_client=Depends(get_db)):
    async with rds_client.cursor() as cur:
        await cur.execute("""
            UPDATE users SET status = 'active'
            WHERE username IN (
                    SELECT username
                    FROM user_validation_tokens
                    WHERE token = %s
            )
            """, (activation_token))
    return 200

# User Login Route
class LoginRequest(BaseModel):
    username: str
    password: str
@router.post("/users/login")
async def user_login(request:LoginRequest, response:Response, rds_client=Depends(get_db), session_storage=Depends(get_sessions)):
    # verify password is correct
    async with rds_client.cursor() as cur:
        await cur.execute("""
            SELECT * FROM users
            WHERE (username) = (%s)
            """, (request.username))
        user_result_row = await cur.fetchone()
    if not user_result_row:
        raise HTTPException(status_code=401)
    # verify password is correct
    try:
        nacl.pwhash.argon2id.verify(user_result_row['password'].encode('utf-8'), request.password.encode('utf-8'))
    except nacl.exceptions.InvalidkeyError:
        raise HTTPException(status_code=401)
    # add Redis entry {session_id:username} with 2 hour timeout
    session_id = session_storage.makeNewUserSession(request.username, is_vendor=user_result_row["is_vendor"])
    # return session id in response body and cookie
    response.set_cookie(key="session_id", value=session_id)

@router.post("/users/logout")
async def users_logout(response:Response, session_id:str=Cookie(None), session_storage=Depends(get_sessions)):
    # destroy session by deleting session entry from Redis
    if not session_id:
        return
    session_storage.session_storage_client.delete(session_id)
    # and deleting the session cookie from the client
    response.delete_cookie(key="session_id")

@router.get("/users/whoami")
async def users_whoami(session_id:str=Cookie(None), rds_client=Depends(get_db), session_storage=Depends(get_sessions)):
    if not session_id:
        return
    username = session_storage.getUserFromSession(session_id)
    async with rds_client.cursor() as cur:
        await cur.execute("""
            SELECT username, email, status, is_vendor
            FROM users
            WHERE username = %s
            """, (username))
    return await cur.fetchone()

@router.get("/users/{user_id}")
async def get_user_profile(user_id: str, rds_client=Depends(get_db)):
    """Get public user profile information"""
    async with rds_client.cursor() as cur:
        await cur.execute("""
            SELECT username, is_vendor
            FROM users
            WHERE username = %s
            """, (user_id,))
        user = await cur.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "username": user['username'],
        "is_vendor": user['is_vendor']
    }

@router.get("/users/{user_id}/purchases/count")
async def get_user_purchases_count(user_id: str, rds_client=Depends(get_db)):
    """Get count of completed purchases by a user (buyer=user_id, shipped status, paid invoice)"""
    async with rds_client.cursor() as cur:
        # Query for completed purchases
        await cur.execute("""
            SELECT COUNT(DISTINCT o.order_id) as count
            FROM orders o
            JOIN order_shipping os ON o.order_id = os.order_id
            WHERE o.buyer = %s AND os.shipping_status = 'shipped'
            """, (user_id,))
        result = await cur.fetchone()
    
    # Additionally check that invoices are paid (confirmed)
    # This requires calling the invoice service for each order
    async with rds_client.cursor() as cur:
        await cur.execute("""
            SELECT DISTINCT o.order_id, o.invoice_id
            FROM orders o
            JOIN order_shipping os ON o.order_id = os.order_id
            WHERE o.buyer = %s AND os.shipping_status = 'shipped'
            """, (user_id,))
        orders = await cur.fetchall()
    
    paid_count = 0
    for order in orders:
        try:
            invoice_response = requests.get(f"{settings.PAYMENTS_BASE_URL}/invoice/{order['invoice_id']}")
            if invoice_response.status_code == 200:
                invoice_data = invoice_response.json()
                if invoice_data.get('status') == 'confirmed':
                    paid_count += 1
        except Exception as e:
            logging.error(f"Error fetching invoice {order['invoice_id']}: {e}")
    
    return {"count": paid_count}

@router.get("/users/{user_id}/sales/count")
async def get_user_sales_count(user_id: str, rds_client=Depends(get_db)):
    """Get count of completed sales by a user (vendor=user_id, shipped status, paid invoice)"""
    async with rds_client.cursor() as cur:
        # Query for completed sales
        await cur.execute("""
            SELECT DISTINCT o.order_id, o.invoice_id
            FROM orders o
            JOIN order_shipping os ON o.order_id = os.order_id
            WHERE o.vendor = %s AND os.shipping_status = 'shipped'
            """, (user_id,))
        orders = await cur.fetchall()
    
    paid_count = 0
    for order in orders:
        try:
            invoice_response = requests.get(f"{settings.PAYMENTS_BASE_URL}/invoice/{order['invoice_id']}")
            if invoice_response.status_code == 200:
                invoice_data = invoice_response.json()
                if invoice_data.get('status') == 'confirmed':
                    paid_count += 1
        except Exception as e:
            logging.error(f"Error fetching invoice {order['invoice_id']}: {e}")
    
    return {"count": paid_count}