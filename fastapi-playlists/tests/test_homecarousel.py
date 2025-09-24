import json
from fastapi.testclient import TestClient
from Core_M_cajita import app

client = TestClient(app)

# Helper: bypass auth header if DEV_AUTH_BYPASS is true in env
headers = {"Authorization": "Bearer devtoken"}

def test_get_homecarousel():
    r = client.get('/api/homecarousel', headers=headers)
    assert r.status_code == 200

def test_post_insert_with_null_link():
    payload = {"id": 0, "link": None, "imgsrc": "http://example.com/img.jpg", "video": None, "muted": False}
    r = client.post('/api/idhomecarousel', headers=headers, json=payload)
    assert r.status_code == 200
    assert r.json().get('msg') == 'Insertado'

def test_post_insert_with_empty_link_string():
    payload = {"id": 0, "link": "", "imgsrc": "http://example.com/img2.jpg", "video": None, "muted": True}
    r = client.post('/api/idhomecarousel', headers=headers, json=payload)
    assert r.status_code == 200
    assert r.json().get('msg') == 'Insertado'

def test_post_insert_missing_type_should_fail():
    payload = {"id": 0, "link": None, "imgsrc": None, "video": None, "muted": False}
    r = client.post('/api/idhomecarousel', headers=headers, json=payload)
    assert r.status_code == 400

