from fastapi.testclient import TestClient
from Core_M_cajita import app

client = TestClient(app)
headers = {"Authorization": "Bearer devtoken"}

def run():
    print('GET /api/homecarousel')
    r = client.get('/api/homecarousel', headers=headers)
    print(r.status_code, r.text[:200])

    print('\nPOST insert with link:null')
    payload = {"id": 0, "link": None, "imgsrc": "http://example.com/img.jpg", "video": None, "muted": False}
    r = client.post('/api/idhomecarousel', json=payload, headers=headers)
    print(r.status_code, r.text)

    print('\nPOST insert with link:""')
    payload = {"id": 0, "link": "", "imgsrc": "http://example.com/img2.jpg", "video": None, "muted": True}
    r = client.post('/api/idhomecarousel', json=payload, headers=headers)
    print(r.status_code, r.text)

    print('\nPOST insert missing img/video')
    payload = {"id": 0, "link": None, "imgsrc": None, "video": None, "muted": False}
    r = client.post('/api/idhomecarousel', json=payload, headers=headers)
    print(r.status_code, r.text)

if __name__ == '__main__':
    run()
