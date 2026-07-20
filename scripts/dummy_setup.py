import os
import pymysql
import requests

host = "http://127.0.0.1:8001"
dummy_vendor_username = "dummy_vendor"
dummy_vendor_password = "dummy_password"


db_config = {
    "host": os.environ.get("DB_HOST", "127.0.0.1"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASS", "kkfkffspassss"),
    "db": os.environ.get("DB_NAME", "market"),
    "autocommit": True,
    "cursorclass": pymysql.cursors.DictCursor
}

sql_client = pymysql.connect(**db_config)

with requests.Session() as session:
    try:
        response = session.post(f'{host}/users/registration/submit', json={"email":"dummy_vendor@test.dev", "username": dummy_vendor_username, "password": dummy_vendor_password})
        assert response.status_code == 200
        
        with sql_client.cursor() as cur:
            cur.execute("SELECT token FROM user_validation_tokens WHERE username=%s", (dummy_vendor_username))
            activation_token = cur.fetchone()["token"]
        response = session.post(f'{host}/users/registration/activate/{activation_token}')
        assert response.status_code == 200
    except:
        pass # user already exists
    response = session.post(f'{host}/users/login', json={"username": dummy_vendor_username, "password": dummy_vendor_password})
    assert response.status_code == 200
