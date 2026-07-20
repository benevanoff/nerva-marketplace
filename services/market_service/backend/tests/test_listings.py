import unittest
import copy
import requests

import pymysql
from src.dependencies import db_config

from tests.test_user import TestUserAPIs,  create_test_user

class TestListingsAPIs(unittest.TestCase):

    sql_config = copy.deepcopy(db_config)
    sql_config["cursorclass"] = pymysql.cursors.DictCursor
    test_username = "testcase_user"

    simple_form_data = {
        "form_text": {
            'title': 'Test Listing',
            'description': 'This is an example description',
            'price_xnv': 3
        },
        "form_file": {'file': open('tests/test.png', 'rb')}
    }

    @classmethod
    def setUpClass(cls):
        cls.test_host = "http://127.0.0.1:8001"
        cls.sql_client = pymysql.connect(**cls.sql_config)

    def setUp(self):
        with self.sql_client.cursor() as cur:
            cur.execute("DELETE FROM listings")

    def test_listings_not_logged_in(self):
        with requests.Session() as session:
            # get listings - there should be none yet
            response = session.get(f'{self.test_host}/market/listings')
            assert response.status_code == 200
            assert response.json() == []
            # try to create a listing - should fail because not logged in
            response = session.post(f'{self.test_host}/market/listing/create', data=self.simple_form_data["form_text"], files=self.simple_form_data["form_file"])
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
            response = session.post(f'{self.test_host}/market/listing/create', data=self.simple_form_data["form_text"], files=self.simple_form_data["form_file"])
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
            test_listing_id = response_json[0]["listing_id"]
            # get the test listing details by ID
            response = session.get(f'{self.test_host}/market/listing/{test_listing_id}')
            response.status_code == 200
            response_json = response.json()
            assert response_json["vendor"] == TestUserAPIs.test_username
            assert response_json["title"] == "Test Listing"
            assert response_json["description"] == "This is an example description"
            assert ".png" in response_json["image_name"]
            assert response_json["price_xnv"] == 3
            # add another listing
            response = session.post(f'{self.test_host}/market/listing/create', data=self.simple_form_data["form_text"], files={'file': open('tests/tshirt.jpeg', 'rb')})
            assert response.status_code == 200

def create_test_listing():
    # make sure test user is in db
    create_test_user()
    # run the basic test without teardown for side effect of a test listing being created in database
    test_class = TestListingsAPIs()
    test_class.setUpClass()
    test_class.setUp()
    test_class.test_listings_logged_in()