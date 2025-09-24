#!/usr/bin/env python3
import requests
import json
import sys

SECRET = "3e1601b5f867d06c2de5ef515ae93e23e"
TOKEN_URL = 'http://127.0.0.1:8002/auth/client-credentials'
ENDPOINTS = [
    'http://127.0.0.1:8002/allsegments',
    'http://127.0.0.1:8002/homecarousel',
    'http://127.0.0.1:5174/api/allsegments',
    'http://127.0.0.1:5174/api/homecarousel',
]

def pretty_print_resp(r):
    try:
        j = r.json()
        s = json.dumps(j, indent=2, ensure_ascii=False)
        print(s[:2000])
    except Exception:
        text = r.text
        print(text[:2000])

try:
    r = requests.post(TOKEN_URL, json={'client_secret': SECRET}, timeout=15)
    print('POST', TOKEN_URL, 'HTTP', r.status_code)
    pretty_print_resp(r)
    if r.status_code != 200:
        sys.exit(1)
    token = r.json().get('access_token')
    if not token:
        print('No access_token in response')
        sys.exit(1)
    print('\nTOKEN length:', len(token))
    print('TOKEN preview:', token[:120], '...')

    headers = {'Authorization': f'Bearer {token}'}
    for url in ENDPOINTS:
        try:
            print('\nGET', url)
            rr = requests.get(url, headers=headers, timeout=15)
            print('HTTP', rr.status_code)
            pretty_print_resp(rr)
        except Exception as e:
            print('Error calling', url, e)

except Exception as e:
    print('Error', e)
    sys.exit(1)
