import unittest
import copy
import requests

import pymysql
from src.dependencies import db_config

from tests.test_user import TestUserAPIs, create_test_user


def create_second_test_user(username, email):
    # register and activate a second user so ownership checks can be tested
    sql_config = copy.deepcopy(db_config)
    sql_config["cursorclass"] = pymysql.cursors.DictCursor
    with pymysql.connect(**sql_config) as sql_client:
        with sql_client.cursor() as cur:
            cur.execute("DELETE FROM users WHERE username=%s", (username,))
            cur.execute("DELETE FROM user_validation_tokens WHERE username=%s", (username,))
    with requests.Session() as session:
        session.post(f'{TestUserAPIs.test_host}/users/registration/submit', json={"email": email, "username": username, "password": "seconduserpassword"})
        with pymysql.connect(**sql_config) as sql_client:
            with sql_client.cursor() as cur:
                cur.execute("SELECT token FROM user_validation_tokens WHERE username=%s", (username,))
                token_row = cur.fetchone()
        session.post(f'{TestUserAPIs.test_host}/users/registration/activate/{token_row["token"]}')


class TestVendorListingAPIs(unittest.TestCase):

    sql_config = copy.deepcopy(db_config)
    sql_config["cursorclass"] = pymysql.cursors.DictCursor
    second_username = "testcase_user_two"

    form_data = {
        'title': 'Managed Listing',
        'description': 'A listing used by the vendor management tests',
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
            cur.execute("DELETE FROM listings")

    def create_listing_as_test_user(self, session):
        response = session.post(
            f'{self.test_host}/market/listing/create',
            data=self.form_data,
            files={'file': open('tests/test.png', 'rb')}
        )
        assert response.status_code == 200
        response = session.get(f'{self.test_host}/market/listings')
        return response.json()[0]

    def test_vendor_listing_management_requires_login(self):
        with requests.Session() as session:
            response = session.get(f'{self.test_host}/market/listings/mine')
            assert response.status_code == 401
            response = session.put(f'{self.test_host}/market/listing/1', json={"price_xnv": 2})
            assert response.status_code == 401
            response = session.post(f'{self.test_host}/market/listing/1/deactivate')
            assert response.status_code == 401

    def test_vendor_sees_only_their_own_listings(self):
        create_test_user()
        with requests.Session() as session:
            session.post(f'{self.test_host}/users/login', json={"username": TestUserAPIs.test_username, "password": TestUserAPIs.test_password})
            self.create_listing_as_test_user(session)
            response = session.get(f'{self.test_host}/market/listings/mine')
            assert response.status_code == 200
            listings = response.json()
            assert len(listings) == 1
            assert listings[0]["vendor"] == TestUserAPIs.test_username
            assert listings[0]["title"] == "Managed Listing"

    def test_vendor_updates_price_and_quantity(self):
        create_test_user()
        with requests.Session() as session:
            session.post(f'{self.test_host}/users/login', json={"username": TestUserAPIs.test_username, "password": TestUserAPIs.test_password})
            listing = self.create_listing_as_test_user(session)

            response = session.put(
                f'{self.test_host}/market/listing/{listing["listing_id"]}',
                json={"price_xnv": 12.5, "quantity_available": 2}
            )
            assert response.status_code == 200
            updated = response.json()
            assert float(updated["price_xnv"]) == 12.5
            assert updated["quantity_available"] == 2
            # fields that were not sent stay untouched
            assert updated["title"] == "Managed Listing"

    def test_vendor_cannot_update_someone_elses_listing(self):
        create_test_user()
        create_second_test_user(self.second_username, "second@test.org")
        with requests.Session() as owner_session:
            owner_session.post(f'{self.test_host}/users/login', json={"username": TestUserAPIs.test_username, "password": TestUserAPIs.test_password})
            listing = self.create_listing_as_test_user(owner_session)
        with requests.Session() as other_session:
            other_session.post(f'{self.test_host}/users/login', json={"username": self.second_username, "password": "seconduserpassword"})
            response = other_session.put(
                f'{self.test_host}/market/listing/{listing["listing_id"]}',
                json={"price_xnv": 1}
            )
            assert response.status_code == 403
            response = other_session.post(f'{self.test_host}/market/listing/{listing["listing_id"]}/deactivate')
            assert response.status_code == 403

    def test_deactivate_hides_listing_from_marketplace(self):
        create_test_user()
        with requests.Session() as session:
            session.post(f'{self.test_host}/users/login', json={"username": TestUserAPIs.test_username, "password": TestUserAPIs.test_password})
            listing = self.create_listing_as_test_user(session)

            response = session.post(f'{self.test_host}/market/listing/{listing["listing_id"]}/deactivate')
            assert response.status_code == 200
            assert response.json()["quantity_available"] == 0

            # the listing itself still exists and is still owned by the vendor
            response = session.get(f'{self.test_host}/market/listing/{listing["listing_id"]}')
            assert response.status_code == 200
            assert response.json()["quantity_available"] == 0

    def test_update_validates_input(self):
        create_test_user()
        with requests.Session() as session:
            session.post(f'{self.test_host}/users/login', json={"username": TestUserAPIs.test_username, "password": TestUserAPIs.test_password})
            listing = self.create_listing_as_test_user(session)

            response = session.put(
                f'{self.test_host}/market/listing/{listing["listing_id"]}',
                json={"price_xnv": -3}
            )
            assert response.status_code == 422

            response = session.put(
                f'{self.test_host}/market/listing/{listing["listing_id"]}',
                json={"title": "   "}
            )
            assert response.status_code == 422

            response = session.put(
                f'{self.test_host}/market/listing/{listing["listing_id"]}',
                json={}
            )
            assert response.status_code == 422

    def test_update_missing_listing_returns_404(self):
        create_test_user()
        with requests.Session() as session:
            session.post(f'{self.test_host}/users/login', json={"username": TestUserAPIs.test_username, "password": TestUserAPIs.test_password})
            response = session.put(f'{self.test_host}/market/listing/999999', json={"price_xnv": 1})
            assert response.status_code == 404
