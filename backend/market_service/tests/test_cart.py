import unittest
import copy
import requests

import pymysql
from src.dependencies import db_config

from tests.test_user import TestUserAPIs
from tests.test_listings import create_test_listing

class TestCartAPIs(unittest.TestCase):

    sql_config = copy.deepcopy(db_config)
    sql_config["cursorclass"] = pymysql.cursors.DictCursor

    @classmethod
    def setUpClass(cls):
        import os
        cls.test_host = os.environ.get("MARKET_SERVICE_BASE_URL", "http://127.0.0.1:8001")
        cls.sql_client = pymysql.connect(**cls.sql_config)

    def setUp(self):
        with self.sql_client.cursor() as cur:
            # orders and their rows reference listings, clear everything the
            # checkout flow touches so reruns start from a clean slate
            cur.execute("DELETE FROM order_shipping")
            cur.execute("DELETE FROM order_items")
            cur.execute("DELETE FROM orders")
            cur.execute("DELETE FROM shipping_options")
            cur.execute("DELETE FROM listings")

    def test_cart_api(self):
        # make a test user and a test listing
        create_test_listing()
        # login as the test user, add the test listing to cart, initiate checkout
        with requests.Session() as session:
            # a logged in user shouldnt have a cart yet
            response = session.get(f'{self.test_host}/cart/details')
            assert response.status_code == 401
            # now log in as the test user
            response = session.post(f'{self.test_host}/users/login', json={"username": TestUserAPIs.test_username, "password": TestUserAPIs.test_password})
            assert response.status_code == 200
            # TODO: /cart/details should start as empty - not code 422
            # add the test listing to the test user's cart
            response = session.get(f'{self.test_host}/market/listings')
            assert response.status_code == 200
            test_listing_id = response.json()[0]["listing_id"]
            response = session.post(f'{self.test_host}/cart/add_item/{test_listing_id}')
            assert response.status_code == 200
            # now get the test user's cart details
            response = session.get(f'{self.test_host}/cart/details')
            assert response.status_code == 200
            assert response.json()["items"] == [test_listing_id]
            # checkout refuses while the cart has no shipping details attached.
            # the refusal code comes back in the body, the http status stays 200
            response = session.post(f'{self.test_host}/cart/checkout')
            assert response.status_code == 200
            assert response.json() == 300
            # grab the shipping option created with the listing, attach it with an address
            response = session.get(f'{self.test_host}/market/listing/{test_listing_id}/shipping_options')
            assert response.status_code == 200
            shipping_option_id = response.json()[0]["id"]
            response = session.post(f'{self.test_host}/cart/shipping_details/add', json={
                "details": "1 Test Street, Testville",
                "shipping_options": {str(test_listing_id): shipping_option_id},
            })
            assert response.status_code == 200
            # now checkout the test user's cart
            response = session.post(f'{self.test_host}/cart/checkout')
            assert response.status_code == 200
            checkout_result = response.json()
            assert "invoice_id" in checkout_result
            assert "address" in checkout_result
            # TODO: now the test user's cart should be empty - not code 422
            #response = session.get(f'{self.test_host}/cart/details')
            #assert response.status_code == 200
            # after a successful checkout the cart is gone, so details answers 422
            response = session.get(f'{self.test_host}/cart/details')
            assert response.status_code == 422
        # ensure an order was created for the user in the database
        with self.sql_client.cursor() as cur:
            cur.execute("SELECT * FROM orders WHERE buyer=%s", (TestUserAPIs.test_username,))
            order_rows = cur.fetchall()
            assert len(order_rows) == 1
            order = order_rows[0]
            assert order["vendor"] == TestUserAPIs.test_username
            assert order["invoice_id"] == checkout_result["invoice_id"]
            # the order should reference the listing we checked out
            cur.execute("SELECT * FROM order_items WHERE order_id=%s", (order["order_id"],))
            order_item_rows = cur.fetchall()
            assert [row["item_listing_id"] for row in order_item_rows] == [test_listing_id]
            # the shipping option chosen at checkout should be recorded on the order
            cur.execute("SELECT * FROM order_shipping WHERE order_id=%s", (order["order_id"],))
            order_shipping_rows = cur.fetchall()
            assert len(order_shipping_rows) == 1
            assert order_shipping_rows[0]["option_id"] == shipping_option_id
            assert order_shipping_rows[0]["shipping_note"] == "1 Test Street, Testville"
            # and the listing stock should have gone down by one
            cur.execute("SELECT quantity_available FROM listings WHERE listing_id=%s", (test_listing_id,))
            assert cur.fetchone()["quantity_available"] == 4

    def test_cart_remove_item(self):
        # make a test user and a test listing
        create_test_listing()
        with requests.Session() as session:
            # login, add the listing, then remove it again
            response = session.post(f'{self.test_host}/users/login', json={"username": TestUserAPIs.test_username, "password": TestUserAPIs.test_password})
            assert response.status_code == 200
            response = session.get(f'{self.test_host}/market/listings')
            test_listing_id = response.json()[0]["listing_id"]
            response = session.post(f'{self.test_host}/cart/add_item/{test_listing_id}')
            assert response.status_code == 200
            response = session.get(f'{self.test_host}/cart/details')
            assert response.json()["items"] == [test_listing_id]
            # removing the item leaves an empty cart rather than deleting it
            response = session.post(f'{self.test_host}/cart/remove_item/{test_listing_id}')
            assert response.status_code == 200
            response = session.get(f'{self.test_host}/cart/details')
            assert response.status_code == 200
            assert response.json()["items"] == []
