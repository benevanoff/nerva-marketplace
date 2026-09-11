import unittest
import copy
import requests

import pymysql
from src.dependencies import db_config

from tests.test_user import TestUserAPIs, create_test_user

VENDOR_USERNAME = "testcase_vendor"
VENDOR_PASSWORD = "vendorpassword"


def create_vendor_user(test_host, sql_config):
    # register and activate a second user who will play the vendor
    with pymysql.connect(**sql_config) as sql_client:
        with sql_client.cursor() as cur:
            cur.execute("DELETE FROM reviews WHERE username=%s", (VENDOR_USERNAME,))
            cur.execute("DELETE FROM users WHERE username=%s", (VENDOR_USERNAME,))
            cur.execute("DELETE FROM user_validation_tokens WHERE username=%s", (VENDOR_USERNAME,))
    with requests.Session() as session:
        session.post(f'{test_host}/users/registration/submit', json={"email": "vendor@test.org", "username": VENDOR_USERNAME, "password": VENDOR_PASSWORD})
        with pymysql.connect(**sql_config) as sql_client:
            with sql_client.cursor() as cur:
                cur.execute("SELECT token FROM user_validation_tokens WHERE username=%s", (VENDOR_USERNAME,))
                token_row = cur.fetchone()
        session.post(f'{test_host}/users/registration/activate/{token_row["token"]}')


class TestReviewAPIs(unittest.TestCase):

    sql_config = copy.deepcopy(db_config)
    sql_config["cursorclass"] = pymysql.cursors.DictCursor

    listing_form_data = {
        'title': 'Reviewable Listing',
        'description': 'A listing used by the review tests',
        'price_xnv': 5,
        'quantity_available': 4,
        'shipping_option_name': 'Standard',
        'shipping_option_price': 1
    }

    @classmethod
    def setUpClass(cls):
        import os
        cls.test_host = os.environ.get("MARKET_SERVICE_BASE_URL", "http://127.0.0.1:8001")
        cls.sql_client = pymysql.connect(**cls.sql_config)

    def setUp(self):
        with self.sql_client.cursor() as cur:
            cur.execute("DELETE FROM reviews")
            cur.execute("DELETE FROM order_items")
            cur.execute("DELETE FROM orders")
            cur.execute("DELETE FROM listings")

    def create_listing_as_vendor(self):
        create_vendor_user(self.test_host, self.sql_config)
        with requests.Session() as session:
            session.post(f'{self.test_host}/users/login', json={"username": VENDOR_USERNAME, "password": VENDOR_PASSWORD})
            response = session.post(
                f'{self.test_host}/market/listing/create',
                data=self.listing_form_data,
                files={'file': open('tests/test.png', 'rb')}
            )
            assert response.status_code == 200
        with self.sql_client.cursor() as cur:
            cur.execute("SELECT * FROM listings WHERE title=%s", ("Reviewable Listing",))
            return cur.fetchone()

    def login_as_buyer(self):
        create_test_user()
        session = requests.Session()
        session.post(f'{self.test_host}/users/login', json={"username": TestUserAPIs.test_username, "password": TestUserAPIs.test_password})
        return session

    def give_buyer_a_purchase(self, listing_id):
        # drop a fake order in directly, the checkout path needs the
        # invoice service which is out of scope here
        with self.sql_client.cursor() as cur:
            cur.execute("INSERT INTO orders (vendor, buyer, invoice_id) VALUES (%s, %s, %s)", (VENDOR_USERNAME, TestUserAPIs.test_username, 999))
            order_id = cur.lastrowid
            cur.execute("INSERT INTO order_items (order_id, item_listing_id) VALUES (%s, %s)", (order_id, listing_id))

    def test_get_reviews_when_empty(self):
        listing = self.create_listing_as_vendor()
        with requests.Session() as session:
            response = session.get(f'{self.test_host}/market/listing/{listing["listing_id"]}/reviews')
            assert response.status_code == 200
            data = response.json()
            assert data["reviews"] == []
            assert data["count"] == 0
            assert data["average"] is None

    def test_post_review_requires_login(self):
        listing = self.create_listing_as_vendor()
        with requests.Session() as session:
            response = session.post(
                f'{self.test_host}/market/listing/{listing["listing_id"]}/review',
                json={"rating": 5, "comment": "great"}
            )
            assert response.status_code == 401

    def test_rating_must_be_on_the_scale(self):
        listing = self.create_listing_as_vendor()
        session = self.login_as_buyer()
        for bad_rating in (0, 6, -1):
            response = session.post(
                f'{self.test_host}/market/listing/{listing["listing_id"]}/review',
                json={"rating": bad_rating}
            )
            assert response.status_code == 422

    def test_vendor_cannot_review_own_listing(self):
        listing = self.create_listing_as_vendor()
        with requests.Session() as session:
            session.post(f'{self.test_host}/users/login', json={"username": VENDOR_USERNAME, "password": VENDOR_PASSWORD})
            response = session.post(
                f'{self.test_host}/market/listing/{listing["listing_id"]}/review',
                json={"rating": 5, "comment": "obviously five stars"}
            )
            assert response.status_code == 403

    def test_non_buyer_cannot_review(self):
        listing = self.create_listing_as_vendor()
        session = self.login_as_buyer()
        response = session.post(
            f'{self.test_host}/market/listing/{listing["listing_id"]}/review',
            json={"rating": 4, "comment": "never bought it though"}
        )
        assert response.status_code == 403

    def test_buyer_can_review_once(self):
        listing = self.create_listing_as_vendor()
        session = self.login_as_buyer()
        self.give_buyer_a_purchase(listing["listing_id"])

        response = session.post(
            f'{self.test_host}/market/listing/{listing["listing_id"]}/review',
            json={"rating": 4, "comment": "arrived fast, good quality"}
        )
        assert response.status_code == 200
        review = response.json()
        assert review["username"] == TestUserAPIs.test_username
        assert review["rating"] == 4
        assert review["comment"] == "arrived fast, good quality"

        # a second attempt is refused
        response = session.post(
            f'{self.test_host}/market/listing/{listing["listing_id"]}/review',
            json={"rating": 2}
        )
        assert response.status_code == 409

        # the review now shows up with the average
        response = session.get(f'{self.test_host}/market/listing/{listing["listing_id"]}/reviews')
        data = response.json()
        assert data["count"] == 1
        assert data["average"] == 4
        assert len(data["reviews"]) == 1
        assert data["reviews"][0]["username"] == TestUserAPIs.test_username

    def test_review_on_missing_listing(self):
        session = self.login_as_buyer()
        response = session.post(
            f'{self.test_host}/market/listing/999999/review',
            json={"rating": 5}
        )
        assert response.status_code == 404
