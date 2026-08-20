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
            'price_xnv': 3,
            'quantity_available': 5
        },
        "form_file": {'file': open('tests/test.png', 'rb')}
    }

    @classmethod
    def setUpClass(cls):
        import os
        cls.test_host = os.environ.get("MARKET_SERVICE_BASE_URL", "http://127.0.0.1:8001")
        cls.sql_client = pymysql.connect(**cls.sql_config)

    def setUp(self):
        with self.sql_client.cursor() as cur:
            cur.execute("DELETE FROM listings")

    def test_listings_not_logged_in(self):
        with requests.Session() as session:
            # get listings - there should be none yet
            response = session.get(f'{self.test_host}/market/listings')
            assert response.status_code == 200
            response_json = response.json()
            assert response_json["listings"] == []
            assert response_json["total"] == 0
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
            response_json = response.json()
            assert response_json["listings"] == []
            assert response_json["total"] == 0
            # now create a listing
            response = session.post(f'{self.test_host}/market/listing/create', data=self.simple_form_data["form_text"], files=self.simple_form_data["form_file"])
            assert response.status_code == 200
            # now get listings should return the listing
            response = session.get(f'{self.test_host}/market/listings')
            assert response.status_code == 200
            response_json = response.json()
            assert response_json["total"] == 1
            assert response_json["total_pages"] == 1
            listings = response_json["listings"]
            assert len(listings) == 1
            assert listings[0]["vendor"] == TestUserAPIs.test_username
            assert listings[0]["title"] == "Test Listing"
            assert listings[0]["description"] == "This is an example description"
            assert ".png" in listings[0]["image_name"]
            assert listings[0]["price_xnv"] == 3
            assert listings[0]["quantity_available"] == 5
            test_listing_id = listings[0]["listing_id"]
            # get the test listing details by ID
            response = session.get(f'{self.test_host}/market/listing/{test_listing_id}')
            response.status_code == 200
            response_json = response.json()
            assert response_json["vendor"] == TestUserAPIs.test_username
            assert response_json["title"] == "Test Listing"
            assert response_json["description"] == "This is an example description"
            assert ".png" in response_json["image_name"]
            assert response_json["price_xnv"] == 3
            assert response_json["quantity_available"] == 5
            # add another listing without specifying quantity_available - should default to 1
            form_text_default_qty = {
                'title': 'Test Listing 2',
                'description': 'Another example description that is long enough',
                'price_xnv': 7
            }
            response = session.post(f'{self.test_host}/market/listing/create', data=form_text_default_qty, files={'file': open('tests/tshirt.jpeg', 'rb')})
            assert response.status_code == 200
            response = session.get(f'{self.test_host}/market/listings')
            response_json = response.json()
            assert response_json["total"] == 2
            listings = response_json["listings"]
            assert len(listings) == 2
            default_qty_listing = next(l for l in listings if l["title"] == "Test Listing 2")
            assert default_qty_listing["quantity_available"] == 1
            # try to create a listing with an invalid quantity - should be rejected
            form_text_bad_qty = {
                'title': 'Bad Listing',
                'description': 'This should be rejected',
                'price_xnv': 1,
                'quantity_available': 0
            }
            response = session.post(f'{self.test_host}/market/listing/create', data=form_text_bad_qty, files={'file': open('tests/test.png', 'rb')})
            assert response.status_code == 422

    def test_listings_pagination_and_search(self):
        create_test_user()
        with requests.Session() as session:
            response = session.post(f'{self.test_host}/users/login', json={"username": TestUserAPIs.test_username, "password": TestUserAPIs.test_password})
            assert response.status_code == 200
            # create 3 listings with distinct titles
            for i in range(3):
                form = {
                    'title': f'SearchTest Listing {i}',
                    'description': 'desc',
                    'price_xnv': i + 1,
                    'quantity_available': 1
                }
                response = session.post(f'{self.test_host}/market/listing/create', data=form, files={'file': open('tests/test.png', 'rb')})
                assert response.status_code == 200
            # test pagination: per_page=2 should return 2 items on page 1
            response = session.get(f'{self.test_host}/market/listings?per_page=2&page=1')
            assert response.status_code == 200
            data = response.json()
            assert len(data["listings"]) == 2
            assert data["total"] >= 3
            assert data["page"] == 1
            # page 2 should return the remaining
            response = session.get(f'{self.test_host}/market/listings?per_page=2&page=2')
            data = response.json()
            assert data["page"] == 2
            # test search: should only return matching listings
            response = session.get(f'{self.test_host}/market/listings?search=SearchTest')
            data = response.json()
            for l in data["listings"]:
                assert 'SearchTest' in l['title']
            assert data["total"] == 3
            # test sort by price ascending
            response = session.get(f'{self.test_host}/market/listings?search=SearchTest&sort_by=price-low')
            data = response.json()
            prices = [l["price_xnv"] for l in data["listings"]]
            assert prices == sorted(prices)
            # test sort by price descending
            response = session.get(f'{self.test_host}/market/listings?search=SearchTest&sort_by=price-high')
            data = response.json()
            prices = [l["price_xnv"] for l in data["listings"]]
            assert prices == sorted(prices, reverse=True)

def create_test_listing():
    # make sure test user is in db
    create_test_user()
    # run the basic test without teardown for side effect of a test listing being created in database
    test_class = TestListingsAPIs()
    test_class.setUpClass()
    test_class.setUp()
    test_class.test_listings_logged_in()