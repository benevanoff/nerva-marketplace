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
        cls.test_host = "http://127.0.0.1:8001"
        cls.sql_client = pymysql.connect(**cls.sql_config)

    def setUp(self):
        with self.sql_client.cursor() as cur:
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
            # now checkout the test user's cart
            response = session.post(f'{self.test_host}/cart/checkout')
            assert response.status_code == 200
            # TODO: now the test user's cart should be empty - not code 422
            #response = session.get(f'{self.test_host}/cart/details')
            #assert response.status_code == 200
        # TODO: ensure an order was created for the user in the database