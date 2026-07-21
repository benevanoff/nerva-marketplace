import os
import uuid
import imghdr
import logging
from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter
from fastapi import FastAPI, Request, Depends, HTTPException, Response, Cookie, File, UploadFile, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .dependencies import get_db, get_sessions

market_router = APIRouter()

class ListingStorage:

    MAX_FILE_SIZE = 1024*1024*10 # 10Mb max file size
    VALID_FILE_EXTENSIONS = ["jpg", "jpeg", "png"]

    def __init__(self):
        self.storage_root = f'{os.getcwd()}/listing_image_storage'

    async def addFile(self, file:UploadFile, filetype:str):
        assert file.size < self.MAX_FILE_SIZE
        img_id = str(uuid.uuid4())
        with open(f'{self.storage_root}/{img_id}.{filetype}', 'wb') as local_file:
            local_file.write(await file.read())
        return img_id


@market_router.get("/market/listings")
async def get_listings(rds_client=Depends(get_db)):
    async with rds_client.cursor() as cur:
        await cur.execute("SELECT * FROM listings LIMIT 20")
        listing_rows = await cur.fetchall()
    return listing_rows

@market_router.get("/market/listing/{listing_id}")
async def get_listing_details(listing_id:int, rds_client=Depends(get_db)):
    async with rds_client.cursor() as cur:
        await cur.execute("SELECT * FROM listings WHERE listing_id=%s", (listing_id))
        listing_row = await cur.fetchone()
    return listing_row

@market_router.post("/market/listing/create")
async def create_listing(session_id:str=Cookie(None), session_storage=Depends(get_sessions),
                         rds_client=Depends(get_db),
                         title: str = Form(...), description: str = Form(...),
                         price_xnv: float = Form(...),
                         file: Optional[UploadFile] = File(None)):
    # We need a valid session_id
    if not session_id:
        raise HTTPException(status_code=401, detail="Must be logged in to create a listing")
    # TODO: check that the session_id actually exists in our session storage
    username = session_storage.getUserFromSession(session_id)
    # enfore a max file size
    if file.size > ListingStorage.MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail="File too big")
    # enforce image file extensions only
    if not file.filename.endswith(tuple(ListingStorage.VALID_FILE_EXTENSIONS)):
        raise HTTPException(status_code=422, detail="Invalid file extension")
    # enfore image MIME types only
    contents = await file.read()
    file_type = imghdr.what(None, h=contents)
    if file_type not in ListingStorage.VALID_FILE_EXTENSIONS:
        raise HTTPException(status_code=422, detail="Invalid image file.")
    # store the file in our storage bucket
    storage = ListingStorage()
    await file.seek(0)
    img_id = await storage.addFile(file, file_type)
    # store the title, description, price, and a reference to the image in our SQL table
    async with rds_client.cursor() as cur:
        await cur.execute("""
            INSERT INTO listings
                (title, description, image_name, price_xnv, vendor)
            VALUES
                (%s, %s, %s, %s, %s)
            """, (title, description, f'{img_id}.{file_type}', price_xnv, username))

@market_router.get("/market/listing/image/{image_name}")
async def get_image(image_name:str, rds_client=Depends(get_db)):
    # make sure file name requested is referenced in our listings table
    async with rds_client.cursor() as cur:
        await cur.execute("SELECT image_name FROM listings WHERE image_name = %s", (image_name))
        result = await cur.fetchall()
    if len(result) < 1:
        raise HTTPException(status_code=404)
    # get the file from the storage bucket and return it
    file_extension = image_name.split(".")[-1]
    return FileResponse(f'{ListingStorage().storage_root}/{image_name}', media_type=f"image/{file_extension}")