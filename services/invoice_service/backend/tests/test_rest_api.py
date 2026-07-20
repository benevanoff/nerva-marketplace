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
        cls.test_host = "http://127.0.0.1:8002"
        cls.sql_client = pymysql.connect(**cls.sql_config)

    def setUp(self):
        with self.sql_client.cursor() as cur:
            cur.execute("DELETE FROM invoices")
    
    def test_invoice_apis(self):
        with requests.Session() as session:
            response = session.post(f'{self.test_host}/invoice/create', json={"amount": 100})
            assert response.status_code == 200
            response = session.get(f'{self.test_host}/invoice/invoice_id')
            assert response.status_code == 200
            print(response.json())