"""
Ingest playlists from JW Player API (v2) and upsert into local backend.

Env vars required:
- JW_API_KEY: API key/token for JW Player (sent as 'Authorization: Bearer <key>')
- JW_SITE_ID: site id (8 chars), e.g. ql9Lry7y
- API_URL: backend base URL (e.g. https://caja.segrd.com/api)

Optional:
- API_TOKEN: Bearer token for backend (if not present, script will attempt to get one using SECRET_KEY and /auth/client-credentials)
- SECRET_KEY: backend secret to obtain client-credentials token

Usage:
  export JW_API_KEY="..."
  export JW_SITE_ID="ql9Lry7y"
  export API_URL="https://caja.segrd.com/api"
  python3 scripts/jw_api_ingest.py --dry-run

"""
import os
import requests
import logging
import argparse
from typing import Optional, List, Dict

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

JW_API_BASE = "https://api.jwplayer.com/v2"


def fetch_backend_token_if_needed(api_url: str) -> Optional[str]:
    token = os.environ.get('API_TOKEN')
    if token:
        return token if token.startswith('Bearer ') else f'Bearer {token}'
    secret = os.environ.get('SECRET_KEY')
    if not secret:
        logging.info('No backend API_TOKEN or SECRET_KEY provided; proceeding without backend auth')
        return None
    try:
        r = requests.post(f"{api_url.rstrip('/')}/auth/client-credentials", json={"client_secret": secret}, timeout=10)
        r.raise_for_status()
        data = r.json()
        at = data.get('access_token')
        if at:
            return f'Bearer {at}'
    except Exception as e:
        logging.error('Failed to fetch backend token: %s', e)
    return None


def list_jw_playlists(api_key: str, site_id: str, page: int = 1, per_page: int = 50) -> List[Dict]:
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Accept': 'application/json'
    }
    playlists: List[Dict] = []
    url = f"{JW_API_BASE}/sites/{site_id}/playlists"
    params = {'page': page, 'per_page': per_page}
    try:
        r = requests.get(url, headers=headers, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        # JW returns 'playlists' or 'results' depending on endpoint
        items = data.get('playlists') or data.get('results') or data
        if isinstance(items, list):
            playlists.extend(items)
        elif isinstance(items, dict) and 'items' in items:
            playlists.extend(items['items'])
        else:
            logging.warning('Unexpected playlists payload shape: %s', type(items))
    except Exception as e:
        logging.error('Error fetching JW playlists: %s', e)
    return playlists


def normalize_jw_playlist(pl: Dict) -> Dict:
    return {
        'id': pl.get('id') or pl.get('playlist_id') or pl.get('uid'),
        'title': pl.get('name') or pl.get('title'),
        'description': pl.get('description') or pl.get('meta', {}).get('description'),
        'image': pl.get('image') or pl.get('poster') or pl.get('thumbnail'),
        'raw': pl,
    }


def upsert_backend_playlist(api_url: str, token: Optional[str], normalized: Dict, dry_run: bool = True) -> bool:
    payload = {
        'id': normalized['id'] or f"jw-{abs(hash(normalized.get('title') or 'no-title'))}",
        'segid': 0,
        'img': normalized.get('image'),
        'title': normalized.get('title') or '',
        'desc': normalized.get('description') or '',
        'categories': [],
    }
    logging.info('Prepared payload id=%s title=%s', payload['id'], payload['title'][:60])
    if dry_run:
        return True
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = token
    try:
        r = requests.post(f"{api_url.rstrip('/')}/uiplaylist", json=payload, headers=headers, timeout=15)
        r.raise_for_status()
        logging.info('Upsert OK %s', payload['id'])
        return True
    except Exception as e:
        logging.error('Upsert failed for %s: %s', payload['id'], e)
        return False


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--dry-run', action='store_true')
    args = p.parse_args()

    jw_key = os.environ.get('JW_API_KEY')
    site_id = os.environ.get('JW_SITE_ID')
    api_url = os.environ.get('API_URL') or 'http://localhost:8000/api'

    if not jw_key or not site_id:
        logging.error('Environment variables JW_API_KEY and JW_SITE_ID are required')
        return

    token = fetch_backend_token_if_needed(api_url)

    playlists = list_jw_playlists(jw_key, site_id)
    logging.info('Found %d playlists', len(playlists))
    normalized = [normalize_jw_playlist(p) for p in playlists]

    for pl in normalized:
        upsert_backend_playlist(api_url, token, pl, dry_run=args.dry_run)


if __name__ == '__main__':
    main()
