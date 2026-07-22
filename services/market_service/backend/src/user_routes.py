import uuid
import logging
from pydantic import BaseModel
from fastapi import APIRouter
from fastapi import FastAPI, Request, Depends, HTTPException, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .dependencies import get_db, get_sessions

router = APIRouter()

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
            """, (req.username, req.email, req.password))
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
            WHERE (username, password) = (%s, %s)
            AND status = 'active'
            """, (request.username, request.password))
        user_result_row = await cur.fetchone()
    if not user_result_row:
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