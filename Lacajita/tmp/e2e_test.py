#!/usr/bin/env python3
import requests, json, sys

SECRET = "3e1601b5f867d06c2de5ef515ae93e23e"
TOKEN_URL = 'http://127.0.0.1:8002/auth/client-credentials'
ENDPOINTS = [
    'http://127.0.0.1:8002/allsegments',
    'http://127.0.0.1:8002/homecarousel',
    'http://127.0.0.1:5174/api/allsegments',
    'http://127.0.0.1:5174/api/homecarousel',
]

def pretty_print(r):
    try:
        j = r.json()
        s = json.dumps(j, ensure_ascii=False)
        return s[:2000]
    except Exception:
        return r.text[:2000]

try:
    r = requests.post(TOKEN_URL, json={'client_secret': SECRET}, timeout=15)
    print('POST', TOKEN_URL, 'HTTP', r.status_code)
    try:
        print('body:', json.dumps(r.json(), indent=2)[:1000])
    except Exception:
        print('body (raw):', r.text[:1000])
    if r.status_code != 200:
        sys.exit(1)
    token = r.json().get('access_token')
    if not token:
        print('No access_token in response')
        sys.exit(1)
    print('\nTOKEN length:', len(token))

    headers = {'Authorization': f'Bearer {token}'}
    for url in ENDPOINTS:
        try:
            rr = requests.get(url, headers=headers, timeout=15)
            print('\nGET', url, '->', rr.status_code)
            print(pretty_print(rr))
        except Exception as e:
            print('\nGET', url, 'error:', e)

except Exception as e:
    print('Error during test:', e)
    sys.exit(1)
