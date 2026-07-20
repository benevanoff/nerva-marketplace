import unittest
import copy
import requests

import pymysql
from src.dependencies import db_config

class TestUserAPIs(unittest.TestCase):

    sql_config = copy.deepcopy(db_config)
    sql_config["cursorclass"] = pymysql.cursors.DictCursor
    test_username = "testcase_user"
    test_password = "testuserpassword"

    @classmethod
    def setUpClass(cls):
        cls.test_host = "http://127.0.0.1:8001"
        cls.sql_client = pymysql.connect(**TestUserAPIs.sql_config)

    def setUp(self):
        with self.sql_client.cursor() as cur: 
            cur.execute("DELETE FROM users WHERE username='testcase_user'")
            cur.execute("DELETE FROM user_validation_tokens WHERE username='testcase_user'")

    def get_test_user_row(self):
        with self.sql_client.cursor() as cur:
            cur.execute("SELECT * FROM users where username='testcase_user'")
            test_user_row = cur.fetchone()
        return test_user_row
    
    def get_test_user_activation_token(self):
        # Get activation token directly from database since the test email address is fake
        with self.sql_client.cursor() as cur:
            cur.execute("SELECT * FROM user_validation_tokens WHERE username='testcase_user'")
            test_user_validation_token_row = cur.fetchone()
        return test_user_validation_token_row["token"]

    def test_user_registration(self):
        with requests.Session() as session:
            # Submit a new user registration form
            session.post(f'{self.test_host}/users/registration/submit', json={"email":"test@test.org", "username": self.test_username, "password": self.test_password})
            test_user_row = self.get_test_user_row()
            assert test_user_row["status"] == "unverified"
            # Get activation token directly from database since the test email address is fake
            activation_token = self.get_test_user_activation_token()
            # Activate the user with the activation token
            session.post(f'{self.test_host}/users/registration/activate/{activation_token}')
            test_user_row = self.get_test_user_row()
            assert test_user_row["status"] == "active"

    def test_user_login_logout(self):
        with requests.Session() as session:
            # The whoami endpoint should return None if we are not logged in
            whoami_response = session.get(f'{self.test_host}/users/whoami')
            assert whoami_response.json() is None
            # Submit a new user registration form
            session.post(f'{self.test_host}/users/registration/submit', json={"email":"test@test.org", "username": self.test_username, "password": self.test_password})
            # Activate the user with the activation token
            session.post(f'{self.test_host}/users/registration/activate/{self.get_test_user_activation_token()}')
            # Login as the newly created test user
            session.post(f'{self.test_host}/users/login', json={"username": self.test_username, "password": self.test_password})
            # Check that we are logged in as the user
            whoami_response = session.get(f'{self.test_host}/users/whoami')
            assert whoami_response.status_code == 200
            assert whoami_response.json()["username"] == self.test_username
            # Logout
            session.post(f'{self.test_host}/users/logout')
            # Ensure the whoami response no longer returns user details
            whoami_response = session.get(f'{self.test_host}/users/whoami')
            assert whoami_response.json() is None

    def tearDown(self):
        pass

def create_test_user():
    # First delete any old user with the test username if one exists
    with pymysql.connect(**TestUserAPIs.sql_config) as sql_client:
        with sql_client.cursor() as cur:
            cur.execute("DELETE FROM users WHERE username=%s", (TestUserAPIs.test_username))
    # run the user registration test without tear down for a side effect of creating a new user with the username testcase_user
    test_class = TestUserAPIs()
    test_class.setUpClass()
    test_class.setUp()
    test_class.test_user_registration()