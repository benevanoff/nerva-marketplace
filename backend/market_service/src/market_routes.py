import os
import io
import uuid
import imghdr
import json
import logging
from pydantic import BaseModel
from typing import Optional, List
from fastapi import APIRouter
from PIL import Image, ImageOps
from fastapi import FastAPI, Request, Depends, HTTPException, Response, Cookie, File, UploadFile, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .dependencies import get_db, get_sessions


def _normalize_shipping_options(raw_names: Optional[List[str]], raw_prices: Optional[List[str]], raw_options_json: Optional[str] = None):
    if raw_options_json:
        try:
            options = json.loads(raw_options_json)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=422, detail="shipping_options JSON is invalid") from exc
        if isinstance(options, dict):
            options = [options]
        if not isinstance(options, list):
            raise HTTPException(status_code=422, detail="shipping_options must be a list")

        normalized = []
        for option in options:
            if not isinstance(option, dict):
                raise HTTPException(status_code=422, detail="Each shipping option must be an object")
            name = str(option.get("name") or option.get("shipping_option_name") or "").strip()
            price = option.get("price")
            if price is None:
                price = option.get("price_xnv")
            if price is None:
                price = option.get("shipping_option_price")
            if not name:
                raise HTTPException(status_code=422, detail="shipping option name cannot be empty")
            try:
                price_value = float(price)
            except (TypeError, ValueError) as exc:
                raise HTTPException(status_code=422, detail=f"Invalid shipping option price for '{name}'") from exc
            if price_value < 0:
                raise HTTPException(status_code=422, detail="shipping_option_price must be non-negative")
            normalized.append((name, price_value))
        if not normalized:
            return [("Standard Shipping", 0.0)]
        return normalized

    names = raw_names or []
    prices = raw_prices or []
    if len(names) != len(prices):
        raise HTTPException(status_code=422, detail="shipping_option_name and shipping_option_price must have the same number of entries")

    normalized = []
    for name, price in zip(names, prices):
        name = (name or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="shipping_option_name cannot be empty")
        try:
            price_value = float(price)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid shipping option price for '{name}'") from exc
        if price_value < 0:
            raise HTTPException(status_code=422, detail="shipping_option_price must be non-negative")
        normalized.append((name, price_value))

    if not normalized:
        return [("Standard Shipping", 0.0)]
    return normalized


market_router = APIRouter()

class ListingStorage:

    MAX_FILE_SIZE = 1024*1024*10 # 10Mb max file size
    VALID_FILE_EXTENSIONS = ["jpg", "jpeg", "png"]

    def __init__(self):
        self.storage_root = f'{os.getcwd()}/listing_image_storage'
        # Ensure the storage directory exists
        os.makedirs(self.storage_root, exist_ok=True)

    async def addFile(self, file: UploadFile, filetype: str):
        assert file.size < self.MAX_FILE_SIZE
        img_id = str(uuid.uuid4())
        
        file_bytes = await file.read()
        image_stream = io.BytesIO(file_bytes)
        output_path = f'{self.storage_root}/{img_id}.{filetype}'
        # process image with Pillow to drop metadata
        with Image.open(image_stream) as img:
            # before dropping the EXIF container so photos don't end up sideways.
            if filetype in ["jpg", "jpeg"]:
                img = ImageOps.exif_transpose(img)
            # save the image while explicitly stripping metadata
            img.save(output_path, format=img.format, exif=b"", pnginfo=None)
            
        return img_id


@market_router.get("/market/listings")
async def get_listings(rds_client=Depends(get_db)):
    async with rds_client.cursor() as cur:
        await cur.execute("SELECT * FROM listings ORDER BY listing_id DESC LIMIT 20")
        listing_rows = await cur.fetchall()
    return listing_rows

@market_router.get("/market/listing/{listing_id}")
async def get_listing_details(listing_id:int, rds_client=Depends(get_db)):
    async with rds_client.cursor() as cur:
        await cur.execute("SELECT * FROM listings WHERE listing_id=%s", (listing_id))
        listing_row = await cur.fetchone()
    return listing_row

@market_router.get("/market/listing/{listing_id}/shipping_options")
async def get_listing_shipping_options(listing_id:int, rds_client=Depends(get_db)):
    async with rds_client.cursor() as cur:
        await cur.execute("SELECT * FROM shipping_options WHERE listing_id=%s", (listing_id))
        listing_row = await cur.fetchall()
    return listing_row

@market_router.post("/market/listing/create")
async def create_listing(session_id:str=Cookie(None), session_storage=Depends(get_sessions),
                         rds_client=Depends(get_db),
                         title: str = Form(...), description: str = Form(...),
                         price_xnv: float = Form(...),
                         quantity_available: int = Form(1),
                         shipping_option_name: Optional[List[str]] = Form(None),
                         shipping_option_price: Optional[List[str]] = Form(None),
                         shipping_options: Optional[str] = Form(None),
                         file: Optional[UploadFile] = File(None)):
    # We need a valid session_id
    if not session_id:
        raise HTTPException(status_code=401, detail="Must be logged in to create a listing")
    # TODO: check that the session_id actually exists in our session storage
    username = session_storage.getUserFromSession(session_id)
    # enforce a positive integer quantity
    if quantity_available < 1:
        raise HTTPException(status_code=422, detail="quantity_available must be at least 1")

    normalized_shipping_options = _normalize_shipping_options(shipping_option_name, shipping_option_price, shipping_options)

    if file is None:
        raise HTTPException(status_code=422, detail="A listing image is required")
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
                (title, description, image_name, price_xnv, vendor, quantity_available)
            VALUES
                (%s, %s, %s, %s, %s, %s)
            """, (title, description, f'{img_id}.{file_type}', price_xnv, username, quantity_available))
        # Get the listing_id that was just created
        listing_id = cur.lastrowid
        # Insert each shipping option for this listing
        for option_name, option_price in normalized_shipping_options:
            await cur.execute("""
                INSERT INTO shipping_options
                    (name, price_xnv, listing_id)
                VALUES
                    (%s, %s, %s)
                """, (option_name, option_price, listing_id))

    return {"listing_id": listing_id}

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