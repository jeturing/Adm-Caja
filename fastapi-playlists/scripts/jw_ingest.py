"""
Script ligero para extraer playlists/medios de páginas con embed JWPlayer
- Enfoque: buscar `jwplayer(...).setup({...})` o estructuras `playlist: [...]` en el HTML
- Normalizar y enviar los metadatos al backend mediante el endpoint existente `uiplaylist` (o adaptar)

Uso:
  export API_URL=https://mi-backend.example.com/api
  export API_TOKEN="Bearer ..."
  python3 scripts/jw_ingest.py --config scripts/jw_sources.json

Este script evita ejecutar JavaScript (no headless). Si las páginas requieren JS para construir el objeto jwplayer, usar Playwright/Headless (se documenta al final).
"""

import re
import json
import argparse
import logging
import requests
from typing import Optional, List, Dict
from urllib.parse import urlparse
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

# --- Helpers de parsing ---
_setup_regex = re.compile(r"jwplayer\([^)]*\)\.setup\s*\(\s*({[\s\S]*?})\s*\)", re.IGNORECASE)
_playlist_regex = re.compile(r"playlist\s*:\s*(\[[\s\S]*?\])", re.IGNORECASE)
_json_like_fix_trailing_comma = re.compile(r",\s*([}\]])")


def _attempt_json_load(s: str) -> Optional[dict]:
    """Intentar parsear una cadena como JSON tolerante: primero como JSON puro,
    luego reemplazando comillas simples por dobles y eliminando comas finales.
    No es 100% robusto pero funciona en muchos embeds simples."""
    try:
        return json.loads(s)
    except Exception:
        # intentar arreglos simples
        try:
            s2 = s.replace("\\'", "\\\\'")
            s2 = s2.replace("'", '"')
            s2 = _json_like_fix_trailing_comma.sub(r"\1", s2)
            return json.loads(s2)
        except Exception as e:
            logging.debug("json tolerant parse failed: %s", e)
            return None


def extract_jwplayer_config(html: str) -> Optional[dict]:
    """Extrae el objeto pasado a jwplayer(...).setup({...}) o el playlist array.
    Retorna dict con los campos encontrados (puede contener 'playlist' o props directas).
    """
    m = _setup_regex.search(html)
    if m:
        obj_text = m.group(1)
        parsed = _attempt_json_load(obj_text)
        if parsed is not None:
            return parsed
    # fallback: buscar playlist: [ ... ]
    m2 = _playlist_regex.search(html)
    if m2:
        arr_text = m2.group(1)
        parsed = _attempt_json_load(arr_text)
        if parsed is not None:
            return {"playlist": parsed}
    return None


def normalize_playlist_entry(entry: dict) -> Dict:
    """Normaliza una entrada de playlist/video del JWPlayer a un dict simple.
    Campos objetivo: id, title, description, images (poster), sources (video files)
    """
    out = {
        "id": entry.get("mediaid") or entry.get("file") or entry.get("id") or None,
        "title": entry.get("title") or entry.get("name") or None,
        "description": entry.get("description") or entry.get("desc") or None,
        "poster": entry.get("image") or entry.get("poster") or None,
        "sources": [],
    }
    # jwplayer playlist items may have 'sources' or 'file'
    if isinstance(entry.get("sources"), list):
        for s in entry.get("sources"):
            out["sources"].append({"file": s.get("file"), "type": s.get("type")})
    elif entry.get("file"):
        out["sources"].append({"file": entry.get("file"), "type": entry.get("type")})
    return out


class JWIngest:
    def __init__(self, api_url: str, api_token: Optional[str] = None, allowed_hosts: Optional[List[str]] = None):
        self.api_url = api_url.rstrip("/")
        self.api_token = api_token
        self.allowed_hosts = allowed_hosts
        self.session = requests.Session()
        if api_token:
            self.session.headers.update({"Authorization": api_token})
        self.session.headers.update({"User-Agent": "jw-ingest/1.0 (+https://example.com)"})
    def fetch(self, url: str) -> Optional[str]:
        parsed = urlparse(url)
        if self.allowed_hosts and parsed.hostname not in self.allowed_hosts:
            logging.warning("Host %s no está en allowed_hosts; saltando", parsed.hostname)
            return None
        try:
            r = self.session.get(url, timeout=15)
            r.raise_for_status()
            return r.text
        except Exception as e:
            logging.error("Error fetching %s: %s", url, e)
            return None

    def ingest_source(self, url: str, dry_run: bool = False) -> bool:
        logging.info("Procesando %s", url)
        html = self.fetch(url)
        if not html:
            logging.error("No HTML recuperado para %s", url)
            return False
        cfg = extract_jwplayer_config(html)
        if not cfg:
            logging.error("No se encontró configuración jwplayer en %s", url)
            return False

        playlist = cfg.get("playlist")
        # Algunas integraciones devuelven 'file' y 'title' directamente
        if not playlist and cfg.get("file"):
            playlist = [cfg]

        if not playlist:
            logging.error("No se pudo extraer lista de reproducción desde %s", url)
            return False

        normalized = [normalize_playlist_entry(item) for item in playlist]
        logging.info("Encontrados %d elementos", len(normalized))

        if dry_run:
            logging.info("Dry-run: muestra de elementos: %s", json.dumps(normalized[:2], indent=2))
            return True

        # Mapear y llamar a endpoint backend: se asume `uiplaylist` acepta un objeto playlist
        # Adaptar según API local: aquí usamos /api/uiplaylist POST con body { id, segid, img, title, description, categories }
        for p in normalized:
            payload = {
                "id": p["id"] or f"jw-{abs(hash(p.get('title') or 'no-title'))}",
                "segid": 0,
                "img": p.get("poster"),
                "title": p.get("title") or "",
                "desc": p.get("description") or "",
                "categories": [],
            }
            try:
                endpoint = f"{self.api_url}/uiplaylist"
                logging.info("Upsert playlist id=%s -> %s", payload['id'], endpoint)
                r = self.session.post(endpoint, json=payload, timeout=15)
                if r.status_code not in (200,201):
                    logging.error("Upsert fallo para %s: %s %s", payload['id'], r.status_code, r.text[:200])
                else:
                    logging.info("Upsert OK %s", payload['id'])
            except Exception as e:
                logging.error("Error enviando al backend: %s", e)
        return True


def fetch_api_token_if_needed(api_url: str) -> Optional[str]:
    """Si no hay API_TOKEN en entorno, intenta obtener un token via /auth/client-credentials usando SECRET_KEY.
    Retorna 'Bearer <token>' o None si no se pudo obtener.
    """
    token = os.environ.get('API_TOKEN') or os.environ.get('BACKEND_API_TOKEN')
    if token:
        return token if token.startswith('Bearer ') else f'Bearer {token}'

    secret = os.environ.get('SECRET_KEY') or os.environ.get('API_CLIENT_SECRET')
    if not secret:
        logging.info('No SECRET_KEY en entorno y no hay API_TOKEN; no se intentará obtener token.')
        return None

    try:
        url = f"{api_url.rstrip('/')}/auth/client-credentials"
        logging.info('Solicitando token client-credentials a %s', url)
        r = requests.post(url, json={"client_secret": secret}, timeout=10)
        r.raise_for_status()
        data = r.json()
        at = data.get('access_token') or data.get('accessToken')
        if not at:
            logging.error('Respuesta sin access_token: %s', data)
            return None
        bearer = f'Bearer {at}'
        logging.info('Token obtenido correctamente (long=%d)', len(at))
        return bearer
    except Exception as e:
        logging.error('No se pudo obtener token del backend: %s', e)
        return None

    def fetch(self, url: str) -> Optional[str]:
        parsed = urlparse(url)
        if self.allowed_hosts and parsed.hostname not in self.allowed_hosts:
            logging.warning("Host %s no está en allowed_hosts; saltando", parsed.hostname)
            return None
        try:
            r = self.session.get(url, timeout=15)
            r.raise_for_status()
            return r.text
        except Exception as e:
            logging.error("Error fetching %s: %s", url, e)
            return None

    def ingest_source(self, url: str, dry_run: bool = False) -> bool:
        logging.info("Procesando %s", url)
        html = self.fetch(url)
        if not html:
            logging.error("No HTML recuperado para %s", url)
            return False
        cfg = extract_jwplayer_config(html)
        if not cfg:
            logging.error("No se encontró configuración jwplayer en %s", url)
            return False

        playlist = cfg.get("playlist")
        # Algunas integraciones devuelven 'file' y 'title' directamente
        if not playlist and cfg.get("file"):
            playlist = [cfg]

        if not playlist:
            logging.error("No se pudo extraer lista de reproducción desde %s", url)
            return False

        normalized = [normalize_playlist_entry(item) for item in playlist]
        logging.info("Encontrados %d elementos", len(normalized))

        if dry_run:
            logging.info("Dry-run: muestra de elementos: %s", json.dumps(normalized[:2], indent=2))
            return True

        # Mapear y llamar a endpoint backend: se asume `uiplaylist` acepta un objeto playlist
        # Adaptar según API local: aquí usamos /api/uiplaylist POST con body { id, segid, img, title, description, categories }
        for p in normalized:
            payload = {
                "id": p["id"] or f"jw-{abs(hash(p.get('title') or 'no-title'))}",
                "segid": 0,
                "img": p.get("poster"),
                "title": p.get("title") or "",
                "desc": p.get("description") or "",
                "categories": [],
            }
            try:
                endpoint = f"{self.api_url}/uiplaylist"
                logging.info("Upsert playlist id=%s -> %s", payload['id'], endpoint)
                r = self.session.post(endpoint, json=payload, timeout=15)
                if r.status_code not in (200,201):
                    logging.error("Upsert fallo para %s: %s %s", payload['id'], r.status_code, r.text[:200])
                else:
                    logging.info("Upsert OK %s", payload['id'])
            except Exception as e:
                logging.error("Error enviando al backend: %s", e)
        return True


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--config", default="scripts/jw_sources.json", help="Archivo JSON con lista de URLs")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    api_url = os.environ.get('API_URL') or os.environ.get('BACKEND_API') or 'http://localhost:8000/api'
    api_token = os.environ.get('API_TOKEN')
    allowed = None
    allowed_env = os.environ.get('JW_ALLOWED_HOSTS')
    if allowed_env:
        allowed = [h.strip() for h in allowed_env.split(',') if h.strip()]

    try:
        with open(args.config, 'r') as f:
            sources = json.load(f)
    except Exception as e:
        logging.error('No se pudo leer config %s: %s', args.config, e)
        return

    # Si no se pasó API_TOKEN buscarlo vía SECRET_KEY en el backend
    if not api_token:
        api_token = fetch_api_token_if_needed(api_url)
    ing = JWIngest(api_url=api_url, api_token=api_token, allowed_hosts=allowed)

    for s in sources:
        ing.ingest_source(s, dry_run=args.dry_run)


if __name__ == '__main__':
    import os
    main()
