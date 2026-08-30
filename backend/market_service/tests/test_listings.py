import unittest
import copy
import requests

import pymysql
from src.dependencies import db_config

from tests.test_user import TestUserAPIs,  create_test_user


def make_listing_form(title='Test Listing', description='This is an example description',
                      price_xnv=3, quantity_available=5,
                      shipping_option_name='Standard shipping',
                      shipping_option_price=0.5, image='tests/test.png'):
    """Build a create listing form with a freshly opened image file.

    The image handle cannot be shared between requests: once read to build a
    multipart body it sits at eof, and the next request would upload an empty
    file. So every request gets its own handle.
    """
    form_text = {
        'title': title,
        'description': description,
        'price_xnv': price_xnv,
        'shipping_option_name': shipping_option_name,
        'shipping_option_price': shipping_option_price,
    }
    if quantity_available is not None:
        form_text['quantity_available'] = quantity_available
    form_file = {'file': open(image, 'rb')}
    return form_text, form_file


class TestListingsAPIs(unittest.TestCase):

    sql_config = copy.deepcopy(db_config)
    sql_config["cursorclass"] = pymysql.cursors.DictCursor
    test_username = "testcase_user"

    @classmethod
    def setUpClass(cls):
        import os
        cls.test_host = os.environ.get("MARKET_SERVICE_BASE_URL", "http://127.0.0.1:8001")
        cls.sql_client = pymysql.connect(**cls.sql_config)

    def setUp(self):
        with self.sql_client.cursor() as cur:
            # shipping options reference listings, clear both so each test starts clean
            cur.execute("DELETE FROM shipping_options")
            cur.execute("DELETE FROM listings")

    def test_listings_not_logged_in(self):
        with requests.Session() as session:
            # get listings - there should be none yet
            response = session.get(f'{self.test_host}/market/listings')
            assert response.status_code == 200
            assert response.json() == []
            # try to create a listing - should fail because not logged in
            form_text, form_file = make_listing_form()
            response = session.post(f'{self.test_host}/market/listing/create', data=form_text, files=form_file)
            assert response.status_code == 401

    def test_listings_logged_in(self):
        # make a test user
        create_test_user()
        with requests.Session() as session:
            # login as the test user
            response = session.post(f'{self.test_host}/users/login', json={"username": TestUserAPIs.test_username, "password": TestUserAPIs.test_password})
            assert response.status_code == 200
            # get listings - there should be none yet
            response = session.get(f'{self.test_host}/market/listings')
            assert response.status_code == 200
            assert response.json() == []
            # now create a listing
            form_text, form_file = make_listing_form()
            response = session.post(f'{self.test_host}/market/listing/create', data=form_text, files=form_file)
            assert response.status_code == 200
            # now get listings should return the listing
            response = session.get(f'{self.test_host}/market/listings')
            assert response.status_code == 200
            response_json = response.json()
            assert len(response_json) == 1
            assert response_json[0]["vendor"] == TestUserAPIs.test_username
            assert response_json[0]["title"] == "Test Listing"
            assert response_json[0]["description"] == "This is an example description"
            assert ".png" in response_json[0]["image_name"]
            assert response_json[0]["price_xnv"] == 3
            assert response_json[0]["quantity_available"] == 5
            test_listing_id = response_json[0]["listing_id"]
            # the shipping option sent with the form should come back on the listing
            response = session.get(f'{self.test_host}/market/listing/{test_listing_id}/shipping_options')
            assert response.status_code == 200
            shipping_options = response.json()
            assert len(shipping_options) == 1
            assert shipping_options[0]["name"] == "Standard shipping"
            assert float(shipping_options[0]["price_xnv"]) == 0.5
            assert shipping_options[0]["listing_id"] == test_listing_id
            # the stored image should be servable
            response = session.get(f'{self.test_host}/market/listing/image/{response_json[0]["image_name"]}')
            assert response.status_code == 200
            # get the test listing details by ID
            response = session.get(f'{self.test_host}/market/listing/{test_listing_id}')
            assert response.status_code == 200
            response_json = response.json()
            assert response_json["vendor"] == TestUserAPIs.test_username
            assert response_json["title"] == "Test Listing"
            assert response_json["description"] == "This is an example description"
            assert ".png" in response_json["image_name"]
            assert response_json["price_xnv"] == 3
            assert response_json["quantity_available"] == 5
            # add another listing without specifying quantity_available - should default to 1
            form_text, form_file = make_listing_form(title='Test Listing 2',
                                                     description='Another example description that is long enough',
                                                     price_xnv=7, quantity_available=None,
                                                     image='tests/tshirt.jpeg')
            response = session.post(f'{self.test_host}/market/listing/create', data=form_text, files=form_file)
            assert response.status_code == 200
            response = session.get(f'{self.test_host}/market/listings')
            response_json = response.json()
            assert len(response_json) == 2
            default_qty_listing = next(l for l in response_json if l["title"] == "Test Listing 2")
            assert default_qty_listing["quantity_available"] == 1
            # try to create a listing with an invalid quantity - should be rejected
            form_text, form_file = make_listing_form(title='Bad Listing',
                                                     description='This should be rejected',
                                                     price_xnv=1, quantity_available=0)
            response = session.post(f'{self.test_host}/market/listing/create', data=form_text, files=form_file)
            assert response.status_code == 422
            # a listing without a shipping option name should be rejected too
            form_text, form_file = make_listing_form(title='No shipping',
                                                     description='This should be rejected as well',
                                                     price_xnv=1, shipping_option_name='   ')
            response = session.post(f'{self.test_host}/market/listing/create', data=form_text, files=form_file)
            assert response.status_code == 422

def create_test_listing():
    # make sure test user is in db
    create_test_user()
    # run the basic test without teardown for side effect of a test listing being created in database
    test_class = TestListingsAPIs()
    test_class.setUpClass()
    test_class.setUp()
    test_class.test_listings_logged_in()
