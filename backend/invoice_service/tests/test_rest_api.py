import os
import unittest
import copy
import requests

import pymysql
from src.dependencies import db_config

class TestInvoiceAPIs(unittest.TestCase):

    sql_config = copy.deepcopy(db_config)
    sql_config["cursorclass"] = pymysql.cursors.DictCursor

    @classmethod
    def setUpClass(cls):
        cls.test_host = os.environ.get("INVOICE_SERVICE_BASE_URL", "http://127.0.0.1:8002")
        cls.sql_client = pymysql.connect(**cls.sql_config)

    def setUp(self):
        with self.sql_client.cursor() as cur:
            cur.execute("DELETE FROM invoices")

    def test_create_and_fetch_invoice(self):
        with requests.Session() as session:
            response = session.post(f'{self.test_host}/invoice/create', json={"amount": 100})
            assert response.status_code == 200
            created = response.json()
            # every invoice gets a fresh address from the wallet rpc
            assert created["address"]
            assert created["invoice_id"]
            # fetch the invoice back by id
            response = session.get(f'{self.test_host}/invoice/{created["invoice_id"]}')
            assert response.status_code == 200
            fetched = response.json()
            assert fetched["invoice_id"] == created["invoice_id"]
            assert fetched["address"] == created["address"]
            assert float(fetched["amount"]) == 100.0
            assert fetched["status"] == "pending"

    def test_amount_is_required(self):
        with requests.Session() as session:
            response = session.post(f'{self.test_host}/invoice/create', json={})
            assert response.status_code == 422

    def test_unknown_invoice(self):
        with requests.Session() as session:
            # an id that was never issued comes back as an empty body, the api
            # has no not found case yet
            response = session.get(f'{self.test_host}/invoice/999999')
            assert response.status_code == 200
            assert response.json() is None

    def test_addresses_are_unique_per_invoice(self):
        with requests.Session() as session:
            first = session.post(f'{self.test_host}/invoice/create', json={"amount": 1}).json()
            second = session.post(f'{self.test_host}/invoice/create', json={"amount": 2}).json()
            assert first["address"] != second["address"]
