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
                         shipping_option_name: str = Form(...),
                         shipping_option_price: float = Form(...),
                         file: Optional[UploadFile] = File(None)):
    # We need a valid session_id
    if not session_id:
        raise HTTPException(status_code=401, detail="Must be logged in to create a listing")
    # TODO: check that the session_id actually exists in our session storage
    username = session_storage.getUserFromSession(session_id)
    # enforce a positive integer quantity
    if quantity_available < 1:
        raise HTTPException(status_code=422, detail="quantity_available must be at least 1")
    # enforce positive shipping option price
    if shipping_option_price < 0:
        raise HTTPException(status_code=422, detail="shipping_option_price must be non-negative")
    # enforce shipping option name is not empty
    if not shipping_option_name or not shipping_option_name.strip():
        raise HTTPException(status_code=422, detail="shipping_option_name cannot be empty")
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
        # Insert the shipping option for this listing
        await cur.execute("""
            INSERT INTO shipping_options
                (name, price_xnv, listing_id)
            VALUES
                (%s, %s, %s)
            """, (shipping_option_name, shipping_option_price, listing_id))

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


class ReviewSubmission(BaseModel):
    rating: int
    comment: str = ""


@market_router.get("/market/listing/{listing_id}/reviews")
async def get_listing_reviews(listing_id:int, rds_client=Depends(get_db)):
    # the summary (count + average) and the reviews themselves in one go
    async with rds_client.cursor() as cur:
        await cur.execute("SELECT COUNT(*) AS count, AVG(rating) AS average FROM reviews WHERE listing_id=%s", (listing_id,))
        summary_row = await cur.fetchone()
        await cur.execute("""
            SELECT username, rating, comment, create_time
            FROM reviews WHERE listing_id=%s
            ORDER BY create_time DESC
        """, (listing_id,))
        review_rows = await cur.fetchall()
    for review in review_rows:
        if review.get("create_time"):
            review["create_time"] = review["create_time"].strftime("%Y-%m-%d %H:%M:%S")
    return {
        "reviews": review_rows,
        "count": int(summary_row["count"] or 0),
        "average": round(float(summary_row["average"]), 2) if summary_row["average"] is not None else None
    }


@market_router.post("/market/listing/{listing_id}/review")
async def create_listing_review(listing_id:int, submission:ReviewSubmission,
                                session_id:str=Cookie(None), session_storage=Depends(get_sessions),
                                rds_client=Depends(get_db)):
    if not session_id:
        raise HTTPException(status_code=401)
    username = session_storage.getUserFromSession(session_id)
    if not username:
        raise HTTPException(status_code=422)
    # keep the rating on the 1 to 5 scale
    if submission.rating < 1 or submission.rating > 5:
        raise HTTPException(status_code=422, detail="rating must be between 1 and 5")
    if len(submission.comment) > 1024:
        raise HTTPException(status_code=422, detail="comment is too long")
    async with rds_client.cursor() as cur:
        # the listing has to exist
        await cur.execute("SELECT vendor FROM listings WHERE listing_id=%s", (listing_id,))
        listing_row = await cur.fetchone()
        if not listing_row:
            raise HTTPException(status_code=404, detail="Listing not found")
        # reviewing your own listing would be a bit too easy
        if listing_row["vendor"] == username:
            raise HTTPException(status_code=403, detail="Vendors cannot review their own listings")
        # only people who actually bought this listing can review it
        await cur.execute("""
            SELECT 1
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.order_id
            WHERE o.buyer=%s AND oi.item_listing_id=%s
            LIMIT 1
        """, (username, listing_id))
        purchase_row = await cur.fetchone()
        if not purchase_row:
            raise HTTPException(status_code=403, detail="Only buyers of this listing can review it")
        # one review per buyer per listing, the unique key in the schema
        # backs this up if two requests race each other
        await cur.execute("SELECT review_id FROM reviews WHERE listing_id=%s AND username=%s", (listing_id, username))
        if await cur.fetchone():
            raise HTTPException(status_code=409, detail="You already reviewed this listing")
        await cur.execute("""
            INSERT INTO reviews (listing_id, username, rating, comment)
            VALUES (%s, %s, %s, %s)
        """, (listing_id, username, submission.rating, submission.comment.strip()))
        review_id = cur.lastrowid
        await cur.execute("SELECT username, rating, comment, create_time FROM reviews WHERE review_id=%s", (review_id,))
        review_row = await cur.fetchone()
    if review_row.get("create_time"):
        review_row["create_time"] = review_row["create_time"].strftime("%Y-%m-%d %H:%M:%S")
    return review_row