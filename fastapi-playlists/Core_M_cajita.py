# Core_M_cajita.py
# API La Cajita TV (MySQL) + Auth0 (idéntico a app.py) + endpoints
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Query, Depends, Header, status
from starlette.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.openapi.utils import get_openapi
from starlette.datastructures import CommaSeparatedStrings
from pydantic import BaseModel, validator
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
import os
import re
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
# HTTP / JWT
import requests
from functools import lru_cache
from jose import jwt as jose_jwt
from jose.exceptions import JWTError as JoseJWTError, ExpiredSignatureError as JoseExpiredSignatureError
load_dotenv(dotenv_path='.env')

# Entorno / desarrollo
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
# Permitir bypass de autenticación en desarrollo para facilitar pruebas del frontend.
# Se puede forzar con la variable DEV_AUTH_BYPASS (true/false).
DEV_AUTH_BYPASS = os.getenv("DEV_AUTH_BYPASS", "true" if ENVIRONMENT != "production" else "false").lower() == "true"

# --------- OpenAPI con botón Authorize y prefijos /api/* ----------
# NOTA: la app debe crearse ANTES de usar cualquier decorador @app.*
app = FastAPI(
    title="La Cajita TV API",
    version="1.0.0",
    description=(
        "API para categorías, segmentos, playlists, seasons y videos.\n\n"
        "Autenticación: **Auth0 JWT (RS256)** con audience "
        f"`{os.getenv('AUTH0_API_AUDIENCE', '')}`.\n"
    ),
    openapi_version="3.1.0",
    # Importante: mover docs y openapi a /api/* para que el túnel los dirija al backend
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

# ----------------- Files -----------------
UPLOAD_DIR = 'img'
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "15"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

def _sanitize_filename(name: str) -> str:
    """
    Acepta solo caracteres seguros y evita path traversal.
    """
    if "/" in name or "\\" in name:
        raise HTTPException(status_code=400, detail="Nombre inválido")
    if not re.fullmatch(r"[A-Za-z0-9._-]+", name or ""):
        raise HTTPException(status_code=400, detail="Nombre inválido")
    return name

# ----------------- DB --------------------
# Database connection is configured from environment variables so production
# deployments can provide credentials securely (e.g. via system env or a
# production .env file). For local development you can either set these
# variables in your local `.env` file or rely on the development fallback
# below which points to the included development database name `db_jeturing`.
#
# Production example (do NOT commit real credentials):
# DB_HOST=prod-db-host.example.com
# DB_USER=prod_user
# DB_PASSWORD=verysecret
# DB_NAME=prod_db_name

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASS') or os.getenv('DB_PASSWORD') or ''
DB_NAME = os.getenv('DB_NAME')
DB_PORT = int(os.getenv('DB_PORT')) if os.getenv('DB_PORT') else None
DB_SOCKET = os.getenv('DB_SOCKET') or None

# Development fallback: when not in production and no DB_NAME provided,
# default to the local development database `db_jeturing`. This makes it
# easy to run the app locally without modifying production settings.
if not DB_NAME and ENVIRONMENT != "production":
    # You can override this by setting DEV_DB_NAME in your local .env
    DB_NAME = os.getenv('DEV_DB_NAME', 'db_jeturing')

def getConnection():
    try:
        # Prepare connection args. Support either TCP host+port or unix socket.
        conn_args = {
            'host': DB_HOST,
            'user': DB_USER,
            'password': DB_PASSWORD,
            'database': DB_NAME,
        }
        if DB_PORT:
            conn_args['port'] = DB_PORT
        if DB_SOCKET:
            # mysql.connector uses 'unix_socket' for socket connections
            conn_args['unix_socket'] = DB_SOCKET

        # Helpful debug log (never print password)
        print(f"Connecting to DB host={DB_HOST} port={DB_PORT or 'default'} db={DB_NAME} user={DB_USER}")

        return mysql.connector.connect(**conn_args)
    except Error as err:
        print(f"Error connecting database: {err}")
        raise HTTPException(status_code=500, detail="DB connection error")

# ----------------- Auth0 (idéntico a app.py) -----------------
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_API_AUDIENCE = os.getenv("AUTH0_API_AUDIENCE")  # usar SIEMPRE este, igual que app.py
AUTH0_MGMT_CLIENT_ID = os.getenv("AUTH0_MGMT_CLIENT_ID")
AUTH0_MGMT_CLIENT_SECRET = os.getenv("AUTH0_MGMT_CLIENT_SECRET")
# Opcional: cliente/secret específico para Resource Owner Password Grant (si lo habilitas en Auth0)
AUTH0_ROPG_CLIENT_ID = os.getenv("AUTH0_ROPG_CLIENT_ID")
AUTH0_ROPG_CLIENT_SECRET = os.getenv("AUTH0_ROPG_CLIENT_SECRET")
SECRET_KEY = os.getenv("SECRET_KEY")  # protege /auth/client-credentials
ALGORITHMS = ["RS256"]

if not AUTH0_DOMAIN:
    raise RuntimeError("AUTH0_DOMAIN no está definido en .env.")
if not AUTH0_API_AUDIENCE:
    raise RuntimeError("AUTH0_API_AUDIENCE no está definido en .env.")
if not AUTH0_MGMT_CLIENT_ID or not AUTH0_MGMT_CLIENT_SECRET:
    raise RuntimeError("Faltan AUTH0_MGMT_CLIENT_ID / AUTH0_MGMT_CLIENT_SECRET en .env.")


# Endpoint público para exponer solo variables de configuración seguras para el frontend.
# Devuelve únicamente variables con prefijo VITE_ para evitar filtrar secretos.
def _collect_public_config() -> Dict[str, str]:
    public: Dict[str, str] = {}
    for k, v in os.environ.items():
        if k.startswith("VITE_"):
            public[k] = v
    return public


@lru_cache()
def _register_public_config_route(app: FastAPI):
    @app.get("/config/public")
    def get_public_config():
        return JSONResponse(status_code=200, content={"public_config": _collect_public_config()})


# Registrar la ruta cuando la aplicación FastAPI exista (ya creada arriba).

@lru_cache()
def get_jwk_keys() -> dict:
    """Obtiene JWKS de Auth0 (con cache)."""
    jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    r = requests.get(jwks_url, timeout=10)
    r.raise_for_status()
    return r.json()

def verify_jwt_auth0(authorization: Optional[str] = Header(None)) -> dict:
    """
    Valida JWT RS256 contra Auth0 usando el mismo flujo que app.py
    - Debe venir en header: Authorization: Bearer <token>
    - Valida issuer y audience = AUTH0_API_AUDIENCE
    """
    if authorization is None:
        # En desarrollo permitimos bypass para facilitar la integración frontend
        if DEV_AUTH_BYPASS:
            # Devolver un token 'dev' mínimo que contenga los campos usados por la app
            return {
                "sub": "dev|local",
                "email": os.getenv("DEV_USER_EMAIL", "dev@example.com"),
                "name": os.getenv("DEV_USER_NAME", "Dev Local"),
                "scope": "read:segments write:carousel",
            }
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Encabezado Authorization ausente")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Formato inválido. Use 'Bearer <token>'")
    token = parts[1]

    try:
        jwks = get_jwk_keys()
        unverified_header = jose_jwt.get_unverified_header(token)

        rsa_key = {}
        for key in jwks.get("keys", []):
            if key.get("kid") == unverified_header.get("kid"):
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key.get("use"),
                    "n": key["n"],
                    "e": key["e"],
                }
                break

        if not rsa_key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="No se encontró una clave pública válida (kid)")

        payload = jose_jwt.decode(
            token,
            rsa_key,
            algorithms=ALGORITHMS,
            audience=AUTH0_API_AUDIENCE,    # <- unificado
            issuer=f"https://{AUTH0_DOMAIN}/",
        )
        return payload

    except JoseExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="El token ha expirado")
    except JoseJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail=f"Error al validar token: {e}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail=f"Error inesperado: {e}")

def require_auth(token_data: dict = Depends(verify_jwt_auth0)) -> dict:
    """Dependencia para proteger endpoints."""
    return token_data

# ---- Helpers Management API (Auth0) ----
_mgmt_token: Optional[str] = None

def get_management_token() -> str:
    """Token de Auth0 Management (cache simple en memoria)."""
    global _mgmt_token
    if _mgmt_token:
        return _mgmt_token
    url = f"https://{AUTH0_DOMAIN}/oauth/token"
    payload = {
        "client_id": AUTH0_MGMT_CLIENT_ID,
        "client_secret": AUTH0_MGMT_CLIENT_SECRET,
        "audience": f"https://{AUTH0_DOMAIN}/api/v2/",
        "grant_type": "client_credentials",
    }
    r = requests.post(url, json=payload, timeout=10)
    r.raise_for_status()
    _mgmt_token = r.json().get("access_token")
    return _mgmt_token

# ---------- Auth0 Users cache y utilidades ----------
_users_cache: Dict[str, Any] = {"data": None, "ts": None}
AUTH0_USERS_CACHE_SECONDS = int(os.getenv("AUTH0_USERS_CACHE_SECONDS", "60"))

def _parse_iso8601(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    # Normalizar 'Z' a '+00:00' para fromisoformat
    s = ts.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None

def _fetch_auth0_users() -> List[Dict[str, Any]]:
    """Obtiene todos los usuarios de Auth0 con paginación y caché simple."""
    global _users_cache
    now = datetime.utcnow()
    if _users_cache.get("data") is not None and _users_cache.get("ts"):
        age = (now - _users_cache["ts"]).total_seconds()
        if age < AUTH0_USERS_CACHE_SECONDS:
            return _users_cache["data"]  # type: ignore

    token = get_management_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://{AUTH0_DOMAIN}/api/v2/users"

    users: List[Dict[str, Any]] = []
    page = 0
    per_page = 50
    # Limitar a 2000 para seguridad
    max_pages = 2000 // per_page

    # Pedimos campos mínimos para estadísticas
    fields = [
        "user_id","email","email_verified","blocked","created_at","last_login","last_ip","logins_count","identities","app_metadata","user_metadata"
    ]
    params_base = {
        "fields": ",".join(fields),
        "include_fields": "true",
        "include_totals": "true",
        "sort": "created_at:1",
    }

    while page < max_pages:
        params = {**params_base, "page": page, "per_page": per_page}
        try:
            r = requests.get(url, headers=headers, params=params, timeout=15)
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=502, detail=f"Error conectando con Auth0: {e}")
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail={
                "message": "Auth0 /users falló",
                "status": r.status_code,
                "response": r.text[:500],
            })
        data = r.json()
        # Formato puede ser lista o dict con users; manejamos ambos
        page_users = data.get("users") if isinstance(data, dict) else data
        if not page_users:
            break
        users.extend(page_users)
        if len(page_users) < per_page:
            break
        page += 1

    _users_cache = {"data": users, "ts": now}
    return users

# ================== Endpoints proxy Auth0 Management (solo lectura) ==================
# Estos endpoints exponen datos necesarios para el frontend sin exponer secretos M2M.
# Se protegen con JWT de la API (o bypass en desarrollo) y usan el token M2M del backend.

@app.get("/auth0/users", tags=["auth0"])
def auth0_list_users(page: int = 0, per_page: int = 50, _user: dict = Depends(require_auth)):
    users = _fetch_auth0_users()
    start = max(0, page * per_page)
    end = start + per_page
    return {"users": users[start:end], "total": len(users), "page": page, "per_page": per_page}

@app.get("/auth0/roles", tags=["auth0"])
def auth0_list_roles(_user: dict = Depends(require_auth)):
    token = get_management_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://{AUTH0_DOMAIN}/api/v2/roles"
    r = requests.get(url, headers=headers, timeout=10)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail={"message": "Auth0 roles error", "status": r.status_code, "response": r.text[:300]})
    return r.json()

@app.get("/auth0/users/{user_id}", tags=["auth0"])
def auth0_get_user(user_id: str, _user: dict = Depends(require_auth)):
    token = get_management_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://{AUTH0_DOMAIN}/api/v2/users/{user_id}"
    r = requests.get(url, headers=headers, timeout=10)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail={"message": "Auth0 user error", "status": r.status_code, "response": r.text[:300]})
    return r.json()

@app.get("/auth0/users/{user_id}/roles", tags=["auth0"])
def auth0_get_user_roles(user_id: str, _user: dict = Depends(require_auth)):
    token = get_management_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://{AUTH0_DOMAIN}/api/v2/users/{user_id}/roles"
    r = requests.get(url, headers=headers, timeout=10)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail={"message": "Auth0 user roles error", "status": r.status_code, "response": r.text[:300]})
    return r.json()

# ================== Dashboard: métricas extendidas ==================
class LoginStats(BaseModel):
    total_logins: int
    avg_logins_per_user: float
    last_7d_logins_estimate: int
    users_with_0_logins: int

@app.get("/dashboard/login-stats", response_model=LoginStats, tags=["dashboard"])
def dashboard_login_stats(_user: dict = Depends(require_auth)):
    users = _fetch_auth0_users()
    total_logins = sum(int(u.get("logins_count") or 0) for u in users)
    total_users = max(1, len(users))
    avg = total_logins / total_users
    users_zero = sum(1 for u in users if int(u.get("logins_count") or 0) == 0)
    # Estimación simple: 20% de logins ocurren en últimos 7 días (sin logs de Auth0)
    last7 = int(total_logins * 0.2)
    return LoginStats(
        total_logins=total_logins,
        avg_logins_per_user=round(avg, 2),
        last_7d_logins_estimate=last7,
        users_with_0_logins=users_zero,
    )

class SystemSummary(BaseModel):
    users_total: int
    users_verified: int
    users_blocked: int
    playlists: int
    videos: int
    seasons: int

@app.get("/dashboard/system-summary", response_model=SystemSummary, tags=["dashboard"])
def system_summary(_user: dict = Depends(require_auth)):
    users = _fetch_auth0_users()
    users_total = len(users)
    users_verified = sum(1 for u in users if u.get("email_verified"))
    users_blocked = sum(1 for u in users if u.get("blocked"))

    # Contar entidades de la base de datos
    conn = getConnection(); cur = conn.cursor()
    cur.execute("select count(*) from lacajita_playlists"); playlists = cur.fetchone()[0]
    cur.execute("select count(*) from lacajita_videos"); videos = cur.fetchone()[0]
    cur.execute("select count(*) from lacajita_season"); seasons = cur.fetchone()[0]
    cur.close(); conn.close()

    return SystemSummary(
        users_total=users_total,
        users_verified=users_verified,
        users_blocked=users_blocked,
        playlists=playlists or 0,
        videos=videos or 0,
        seasons=seasons or 0,
    )

# ================== Video Analytics (tracking local + JW Analytics opcional) ==================
class VideoEvent(BaseModel):
    media_id: str
    playlist_id: Optional[str] = None
    event: str  # impression|play|pause|complete|time
    position: Optional[float] = None
    duration: Optional[float] = None
    meta: Optional[Dict[str, Any]] = None

def _ensure_video_plays_table():
    conn = getConnection(); cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS lacajita_video_plays (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            media_id VARCHAR(64) NOT NULL,
            playlist_id VARCHAR(64) NULL,
            user_sub VARCHAR(128) NULL,
            user_email VARCHAR(255) NULL,
            event VARCHAR(32) NOT NULL,
            position_s DOUBLE NULL,
            duration_s DOUBLE NULL,
            user_agent TEXT NULL,
            ip_addr VARCHAR(64) NULL,
            extra_json TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    )
    conn.commit(); cur.close(); conn.close()

@app.post("/analytics/video-event", tags=["analytics"]) 
def track_video_event(evt: VideoEvent, request: Request, claims: dict = Depends(require_auth)):
    _ensure_video_plays_table()
    ua = request.headers.get("user-agent")
    ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    conn = getConnection(); cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO lacajita_video_plays (media_id, playlist_id, user_sub, user_email, event, position_s, duration_s, user_agent, ip_addr, extra_json)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (
            evt.media_id, evt.playlist_id, claims.get("sub"), claims.get("email"), evt.event,
            evt.position, evt.duration, ua, ip, (str(evt.meta) if evt.meta is not None else None)
        ),
    )
    conn.commit(); cur.close(); conn.close()
    return {"status": "ok"}

class VideoConsumptionSummary(BaseModel):
    total_events: int
    plays: int
    completes: int
    unique_users: int
    total_seconds_watched_estimate: float
    top_videos: List[Dict[str, Any]]
    last_7d: List[Dict[str, Any]]

@app.get("/dashboard/video-consumption", response_model=VideoConsumptionSummary, tags=["dashboard"]) 
def video_consumption(days: int = 30, _user: dict = Depends(require_auth)):
    _ensure_video_plays_table()
    conn = getConnection(); cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT COUNT(*) as total,
               SUM(CASE WHEN event='play' THEN 1 ELSE 0 END) AS plays,
               SUM(CASE WHEN event='complete' THEN 1 ELSE 0 END) AS completes
        FROM lacajita_video_plays
        WHERE created_at >= NOW() - INTERVAL %s DAY
        """,
        (days,)
    )
    agg = cur.fetchone() or {"total": 0, "plays": 0, "completes": 0}

    # Unique users
    cur.execute(
        """
        SELECT COUNT(DISTINCT COALESCE(user_email, user_sub)) AS u
        FROM lacajita_video_plays
        WHERE created_at >= NOW() - INTERVAL %s DAY
        """,
        (days,)
    )
    uu = cur.fetchone().get("u", 0)

    # Estimar segundos vistos: usar suma de position_s de eventos 'time' por (user,media) como aproximación
    cur.execute(
        """
        SELECT media_id, COALESCE(user_email, user_sub) AS u, MAX(position_s) AS maxpos
        FROM lacajita_video_plays
        WHERE created_at >= NOW() - INTERVAL %s DAY AND event IN ('time','complete')
        GROUP BY media_id, COALESCE(user_email, user_sub)
        """,
        (days,)
    )
    rows = cur.fetchall() or []
    total_seconds = float(sum((r.get("maxpos") or 0.0) for r in rows))

    # Top videos por eventos
    cur.execute(
        """
        SELECT media_id,
               SUM(CASE WHEN event='play' THEN 1 ELSE 0 END) AS plays,
               SUM(CASE WHEN event='complete' THEN 1 ELSE 0 END) AS completes,
               COUNT(*) AS events
        FROM lacajita_video_plays
        WHERE created_at >= NOW() - INTERVAL %s DAY
        GROUP BY media_id
        ORDER BY events DESC
        LIMIT 5
        """,
        (days,)
    )
    top = cur.fetchall() or []

    # Serie últimos 7 días
    cur.execute(
        """
        SELECT DATE(created_at) AS d,
               COUNT(*) AS events,
               SUM(CASE WHEN event='play' THEN 1 ELSE 0 END) AS plays
        FROM lacajita_video_plays
        WHERE created_at >= CURDATE() - INTERVAL 6 DAY
        GROUP BY DATE(created_at)
        ORDER BY d
        """
    )
    last7 = cur.fetchall() or []
    cur.close(); conn.close()

    return VideoConsumptionSummary(
        total_events=int(agg.get("total") or 0),
        plays=int(agg.get("plays") or 0),
        completes=int(agg.get("completes") or 0),
        unique_users=int(uu or 0),
        total_seconds_watched_estimate=round(total_seconds, 2),
        top_videos=top,
        last_7d=last7,
    )

# (Opcional) Integración con JWPlayer Analytics API
JW_API_KEY = os.getenv("JWPLAYER_API_KEY")
JW_API_SECRET = os.getenv("JWPLAYER_API_SECRET")
JW_SITE_ID = os.getenv("JWPLAYER_SITE_ID")

@lru_cache()
def _has_jw_analytics() -> bool:
    return bool(JW_API_KEY and JW_API_SECRET and JW_SITE_ID)

@app.get("/dashboard/jw-analytics/consumption", tags=["dashboard"])
def jw_analytics_consumption(period: str = "7d", _user: dict = Depends(require_auth)):
    if not _has_jw_analytics():
        raise HTTPException(status_code=501, detail="JWPlayer Analytics no configurado")
    try:
        # Nota: ruta de API puede variar según versión. Ejemplo ilustrativo.
        url = f"https://api.jwplayer.com/v2/sites/{JW_SITE_ID}/analytics/queries/video-performance"
        params = {"timeframe": period}
        r = requests.get(url, params=params, auth=(JW_API_KEY, JW_API_SECRET), timeout=15)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail={"message": "JW Analytics error", "status": r.status_code, "response": r.text[:300]})
        return r.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Error JW Analytics: {e}")

# ----------------- Modelos -----------------
class Categories(BaseModel):
    id: int = 0
    name: Optional[str] = None

class Playlist(BaseModel):
    id: str
    segid: int
    img: Optional[str]
    title: str
    desc: str = ""
    categories: list

class SeasVideos(BaseModel):
    season_id: int
    videoarr: list

class Seasons(BaseModel):
    id: int = 0
    playlist_id: str
    name: str
    delete: bool = False

# ======== Modelos Auth0 ========
class Auth0UserCreate(BaseModel):
    email: str
    password: str
    connection: str = "Username-Password-Authentication"

class ClientCredentialsRequest(BaseModel):
    client_secret: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    scope: Optional[str] = None
    usage: str = "Include in Authorization header as: Bearer {access_token}"

class Auth0User(BaseModel):
    sub: str
    email: Optional[str] = None
    name: Optional[str] = None

# --- Adapter para /user/me ---
def get_auth0_user_info(claims: dict = Depends(verify_jwt_auth0)):
    return Auth0User(
        sub=claims.get("sub"),
        email=claims.get("email"),
        name=claims.get("name") or claims.get("nickname"),
    )

# ---------- Endpoints Dashboard: Customers Summary ----------
class CustomersSummary(BaseModel):
    total: int
    active_last_30d: int
    new_last_30d: int
    blocked: int
    verified: int
    unverified: int

@app.get("/dashboard/customers-summary", response_model=CustomersSummary, tags=["dashboard"])
def customers_summary(_user: dict = Depends(require_auth)):
    """Resumen de clientes a partir de usuarios de Auth0.
    - active_last_30d: usuarios con last_login en últimos 30 días.
    - new_last_30d: usuarios con created_at en últimos 30 días.
    - verified: email_verified true; unverified: false.
    - blocked: usuarios bloqueados.
    """
    users = _fetch_auth0_users()
    now = datetime.utcnow()
    d30 = now.timestamp() - 30*24*3600

    total = len(users)
    active = 0
    new = 0
    blocked = 0
    verified = 0
    unverified = 0

    for u in users:
        if u.get("blocked"):
            blocked += 1
        if u.get("email_verified"):
            verified += 1
        else:
            unverified += 1

        # last_login
        ll = _parse_iso8601(u.get("last_login"))
        if ll and ll.timestamp() >= d30:
            active += 1

        # created_at
        ca = _parse_iso8601(u.get("created_at"))
        if ca and ca.timestamp() >= d30:
            new += 1

    return CustomersSummary(
        total=total,
        active_last_30d=active,
        new_last_30d=new,
        blocked=blocked,
        verified=verified,
        unverified=unverified,
    )

class DemographicResponse(BaseModel):
    by_domain: Dict[str, int]
    by_identity_provider: Dict[str, int]
    signups_by_month: Dict[str, int]
    by_country: Dict[str, int] | None = None  # ISO2 -> count

@app.get("/dashboard/customers-demographic", response_model=DemographicResponse, tags=["dashboard"])
def customers_demographic(_user: dict = Depends(require_auth)):
    """Estadísticas demográficas simples a partir de Auth0.
    - by_domain: conteo por dominio de email.
    - by_identity_provider: conteo por proveedor (google-oauth2, auth0, etc.).
    - signups_by_month: inscripciones por YYYY-MM.
    """
    users = _fetch_auth0_users()
    by_domain: Dict[str, int] = {}
    by_provider: Dict[str, int] = {}
    by_month: Dict[str, int] = {}
    by_country: Dict[str, int] = {}

    # Mapeo básico nombre -> ISO2 para casos comunes
    name2iso = {
        "united states": "US", "usa": "US", "us": "US", "estados unidos": "US",
        "mexico": "MX", "méxico": "MX", "mx": "MX",
        "spain": "ES", "españa": "ES", "es": "ES",
        "france": "FR", "fr": "FR",
        "argentina": "AR", "ar": "AR",
        "colombia": "CO", "co": "CO",
        "chile": "CL", "cl": "CL",
        "peru": "PE", "perú": "PE",
        "dominican republic": "DO", "república dominicana": "DO", "do": "DO",
        "brazil": "BR", "brasil": "BR", "br": "BR",
        "uk": "GB", "united kingdom": "GB", "reino unido": "GB",
        "germany": "DE", "deutschland": "DE", "de": "DE",
        "italy": "IT", "italia": "IT", "it": "IT",
        "canada": "CA", "ca": "CA",
    }

    def extract_iso2(u: Dict[str, Any]) -> Optional[str]:
        # Intentar user_metadata/app_metadata
        um = u.get("user_metadata") or {}
        am = u.get("app_metadata") or {}
        for source in (um, am):
            if not isinstance(source, dict):
                continue
            code = (source.get("country_code") or source.get("countryCode") or source.get("country_iso2") or "").strip()
            name = (source.get("country") or source.get("location") or source.get("locale_country") or "").strip()
            if code and len(code) == 2:
                return code.upper()
            if name:
                k = name.lower()
                if k in name2iso:
                    return name2iso[k]
        # Fallback: usar TLD del email
        email = (u.get("email") or "").lower()
        if "." in email and "@" in email:
            tld = email.split("@", 1)[1].rsplit(".", 1)[-1]
            tld_map = {
                "us": "US","mx": "MX","es": "ES","fr": "FR","co": "CO","ar": "AR",
                "cl": "CL","pe": "PE","do": "DO","br": "BR","uk": "GB","gb": "GB",
                "de": "DE","it": "IT","ca": "CA"
            }
            if tld in tld_map:
                return tld_map[tld]
        # Sin datos
        return None

    for u in users:
        email = (u.get("email") or "").lower()
        if "@" in email:
            dom = email.split("@", 1)[1]
            by_domain[dom] = by_domain.get(dom, 0) + 1

        for ident in u.get("identities", []) or []:
            prov = ident.get("provider") or "unknown"
            by_provider[prov] = by_provider.get(prov, 0) + 1

        ca = _parse_iso8601(u.get("created_at"))
        if ca:
            key = ca.strftime("%Y-%m")
            by_month[key] = by_month.get(key, 0) + 1

        iso2 = extract_iso2(u)
        if iso2:
            by_country[iso2] = by_country.get(iso2, 0) + 1

    # Ordenar resultado por valor desc para presentaciones
    by_domain = dict(sorted(by_domain.items(), key=lambda x: x[1], reverse=True))
    by_provider = dict(sorted(by_provider.items(), key=lambda x: x[1], reverse=True))
    by_month = dict(sorted(by_month.items()))
    by_country = dict(sorted(by_country.items(), key=lambda x: x[1], reverse=True))

    return DemographicResponse(
        by_domain=by_domain,
        by_identity_provider=by_provider,
        signups_by_month=by_month,
        by_country=by_country or None,
    )

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title, version=app.version, description=app.description, routes=app.routes
    )
    schema.setdefault("components", {}).setdefault("securitySchemes", {})
    schema["components"]["securitySchemes"]["bearerAuth"] = {
        "type": "http", "scheme": "bearer", "bearerFormat": "JWT"
    }
    schema["security"] = [{"bearerAuth": []}]
    app.openapi_schema = schema
    return schema

app.openapi = custom_openapi

# Registrar ruta de configuración pública ahora que `app` existe
_register_public_config_route(app)

@app.middleware("http")
async def strip_api_prefix(request: Request, call_next):
    """Permite servir los endpoints bajo el prefijo /api/* sin duplicar rutas.
    - Mantiene /api/docs y /api/openapi.json sin recorte.
    - Para el resto, elimina el prefijo /api para que coincidan con las rutas definidas.
    """
    path = request.url.path or ""
    if path.startswith("/api/docs") or path.startswith("/api/openapi.json"):
        return await call_next(request)
    if path.startswith("/api/"):
        new_path = path[len("/api"):]
        request.scope["path"] = new_path
        request.scope["raw_path"] = new_path.encode("utf-8")
    return await call_next(request)

# ----------------- CORS -------------------
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "") or os.getenv("CORS_ALLOWED_ORIGINS", "")
CORS_METHODS = os.getenv("CORS_METHODS", "GET,POST,PUT,DELETE,OPTIONS")
CORS_HEADERS = os.getenv("CORS_HEADERS", "Authorization,Content-Type,Accept")
CORS_CREDENTIALS = os.getenv("CORS_CREDENTIALS", "true").lower() == "true"

allowed_origins = [o.strip() for o in CommaSeparatedStrings(CORS_ORIGINS) if o.strip()] or ["http://localhost:5174"]
allowed_methods = [m.strip() for m in CommaSeparatedStrings(CORS_METHODS) if m.strip()]
allowed_headers = [h.strip() for h in CommaSeparatedStrings(CORS_HEADERS) if h.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=allowed_methods,
    allow_headers=allowed_headers,
    allow_credentials=CORS_CREDENTIALS,
)

# ================== ENDPOINTS Auth0 ==================

@app.get("/user/me", response_model=Auth0User, tags=["authentication"])
def get_my_profile(user_info: Auth0User = Depends(get_auth0_user_info)):
    return user_info

@app.post("/auth0/users", tags=["authentication"])
def create_auth0_user(user: Auth0UserCreate):
    """Crear usuario en Auth0 Management."""
    token = get_management_token()
    url = f"https://{AUTH0_DOMAIN}/api/v2/users"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.post(url, json=user.dict(), headers=headers, timeout=10)
    if resp.status_code != 201:
        # devuelve json de error tal cual
        raise HTTPException(status_code=resp.status_code, detail=resp.json())
    return resp.json()

@app.post("/login", tags=["authentication"])
def login_grant(email: str, password: str):
    """Resource Owner Password Grant (solo pruebas/backoffice)."""
    url = f"https://{AUTH0_DOMAIN}/oauth/token"
    # Preferir un cliente dedicado para ROPG si está configurado. No usar credenciales M2M
    client_id = AUTH0_ROPG_CLIENT_ID or AUTH0_MGMT_CLIENT_ID
    client_secret = AUTH0_ROPG_CLIENT_SECRET or AUTH0_MGMT_CLIENT_SECRET

    data = {
        "grant_type": "password",
        "username": email,
        "password": password,
        "audience": AUTH0_API_AUDIENCE,
        "scope": "openid profile email",
        "client_id": client_id,
        "client_secret": client_secret,
    }

    try:
        r = requests.post(url, json=data, timeout=10)
        # Si Auth0 devuelve un error, devolver detalle estructurado para debugging
        if r.status_code != 200:
            try:
                err_json = r.json()
            except Exception:
                err_json = {"error": r.text}
            raise HTTPException(status_code=r.status_code, detail={
                "message": "Auth0 error during Resource Owner Password Grant",
                "auth0_status": r.status_code,
                "auth0_response": err_json,
                "used_client_id": client_id,
            })
        return r.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Connection error to Auth0: {str(e)}")

@app.post("/auth/client-credentials", response_model=TokenResponse, tags=["authentication"])
def get_client_credentials_token(request: ClientCredentialsRequest):
    """
    Client Credentials Grant (protegido por SECRET_KEY local).
    Igual a app.py: usa AUTH0_API_AUDIENCE.
    """
    if request.client_secret != SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Client secret inválido")

    url = f"https://{AUTH0_DOMAIN}/oauth/token"
    data = {
        "client_id": AUTH0_MGMT_CLIENT_ID,
        "client_secret": AUTH0_MGMT_CLIENT_SECRET,
        "audience": AUTH0_API_AUDIENCE,     # <- unificado
        "grant_type": "client_credentials",
    }

    try:
        response = requests.post(url, json=data, timeout=10)
        if response.status_code != 200:
            # detalle útil
            try:
                error_json = response.json()
            except Exception:
                error_json = {"error": response.text}
            detail = {
                "status_code": response.status_code,
                "auth0_error": error_json,
                "url": url,
                "client_id": AUTH0_MGMT_CLIENT_ID,
                "audience": AUTH0_API_AUDIENCE,
                "domain": AUTH0_DOMAIN,
            }
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail=f"Error de Auth0 ({response.status_code}): {detail}")

        t = response.json()
        return TokenResponse(
            access_token=t.get("access_token"),
            token_type=t.get("token_type", "Bearer"),
            expires_in=t.get("expires_in"),
            scope=t.get("scope"),
            usage=f"Include in Authorization header as: Bearer {t.get('access_token')}",
        )
    except HTTPException:
        raise
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error de conexión con Auth0: {str(e)}")

# ================== RUTAS ORIGINALES (PROTEGIDAS CON JWT) ==================

@app.get('/categories', tags=["core"])
def getCategories(user: dict = Depends(require_auth)):
    conn = getConnection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "select c.*, case when exists(select id from lacajita_playlist_categories where id_category=c.id) "
        "then 1 else 0 end as hascat from lacajita_categories c"
    )
    cat = cursor.fetchall()
    cursor.close(); conn.close()
    return cat

class CategoriesModel(BaseModel):
    id: int = 0
    name: Optional[str] = None

@app.post('/icategory', tags=["core"])
def insertCategory(cat: CategoriesModel, user: dict = Depends(require_auth)):
    if not cat.name:
        return {"msg": "Name is empty"}
    conn = getConnection()
    cur = conn.cursor(dictionary=True)
    if cat.id == 0:
        cur.execute("insert into lacajita_categories(name) values(%s)", (cat.name,))
    else:
        cur.execute("update lacajita_categories set name=%s where id=%s", (cat.name, cat.id))
    conn.commit()
    cur.close(); conn.close()
    return {"msg": "Data has been saved"}

@app.post('/dcategory', tags=["core"])
def deleteCategory(cat: CategoriesModel, user: dict = Depends(require_auth)):
    if cat.id <= 0:
        return {"msg": "Identidad invalida"}
    conn = getConnection()
    cur = conn.cursor(dictionary=True)
    cur.execute("delete from lacajita_categories where id=%s", (cat.id,))
    conn.commit()
    cur.close(); conn.close()
    return {"msg": "La categoria ha sido eliminada correctamente"}

@app.get('/segments', tags=["core"])
def getSegments_list(user: dict = Depends(require_auth)):
    conn = getConnection()
    cur = conn.cursor(dictionary=True)
    cur.execute('select * from lacajita_segments where livetv=0')
    seg = cur.fetchall()
    cur.close(); conn.close()
    return seg

@app.get("/manplaylists", tags=["core"])
def getManPlaylist(user: dict = Depends(require_auth)):
    conn = getConnection()
    cur = conn.cursor(dictionary=True)
    cur.execute('select pl.*, se.name as segment from lacajita_playlists pl join lacajita_segments se on pl.segment_id = se.id')
    pl = cur.fetchall()
    cur.execute('select cat.*, pc.id_playlist from lacajita_categories cat join lacajita_playlist_categories pc on pc.id_category = cat.id')
    cate = cur.fetchall()
    cur.execute('select * from lacajita_season')
    seas = cur.fetchall()
    for p in pl:
        p['categories'] = [{'name': c['name'], 'id': c['id']} for c in cate if p['id']==c['id_playlist']]
        p['seasons'] = [s for s in seas if p['id']==s['playlist_id']]
    cur.close(); conn.close()
    return pl

@app.get('/seasons', tags=["core"])
def getSeason(user: dict = Depends(require_auth)):
    conn = getConnection()
    cur = conn.cursor(dictionary=True)
    cur.execute("select * from lacajita_season")
    seasons = cur.fetchall()
    cur.execute("select * from lacajita_videos")
    videos = cur.fetchall()
    for s in seasons:
        s['videos'] = [v['video_id'] for v in videos if s['id'] == v['season_id']]
    cur.close(); conn.close()
    return seasons

class PlaylistModel(BaseModel):
    id: str
    segid: int
    img: Optional[str]
    title: str
    desc: str = ""
    categories: list

@app.post('/uiplaylist', tags=["core"])
def uiPlaylist(pl: PlaylistModel, user: dict = Depends(require_auth)):
    if not (pl.title and pl.id and pl.segid > 0):
        return {"msg": "Titulo, Id y Segmento son obligatorios!"}
    conn = getConnection(); cur = conn.cursor()
    cur.execute("select 1 from lacajita_playlists where id=%s", (pl.id,))
    exists = cur.fetchall()
    if not exists:
        cur.execute("""insert into lacajita_playlists (id, segment_id, img, title, description)
                       values (%s,%s,%s,%s,%s)""", (pl.id, pl.segid, pl.img, pl.title, pl.desc))
        conn.commit()
        for c in pl.categories:
            cur.execute("insert into lacajita_playlist_categories(id_playlist, id_category) values(%s,%s)", (pl.id, c))
            conn.commit()
    else:
        cur.execute("""update lacajita_playlists set id=%s, segment_id=%s, img=%s, title=%s, description=%s
                       where id=%s""", (pl.id, pl.segid, pl.img, pl.title, pl.desc, pl.id))
        cur.execute("delete from lacajita_playlist_categories where id_playlist=%s", (pl.id,))
        conn.commit()
        for c in pl.categories:
            cur.execute("insert into lacajita_playlist_categories(id_playlist, id_category) values(%s,%s)", (pl.id, c))
            conn.commit()
    cur.close(); conn.close()
    return {"msg":"Los datos han sido guardados correctamente!"}

class dPlaylist(BaseModel):
    id: str

@app.post('/dplaylist', tags=["core"])
def dPlaylistDel(pl: dPlaylist, user: dict = Depends(require_auth)):
    if not pl.id:
        return
    conn = getConnection(); cur = conn.cursor()
    cur.execute("""DELETE FROM lacajita_playlists
                   WHERE id = %s
                   and not exists(SELECT * FROM lacajita_playlist_categories WHERE id_playlist = %s)
                   and not exists(SELECT * FROM lacajita_seasons WHERE playlist_id = %s)""",
                (pl.id, pl.id, pl.id))
    conn.commit()
    cur.close(); conn.close()

class SeasVideosModel(BaseModel):
    season_id: int
    videoarr: list

@app.post('/iuseasonvideos', tags=["core"])
def iuseasonvideos(sv: SeasVideosModel, user: dict = Depends(require_auth)):
    conn = getConnection(); cur = conn.cursor()
    cur.execute('DELETE FROM lacajita_videos where season_id=%s', (sv.season_id,))
    conn.commit()
    for v in sv.videoarr:
        cur.execute('insert into lacajita_videos(season_id, video_id) values(%s,%s)', (sv.season_id, v))
        conn.commit()
    cur.close(); conn.close()
    return {"msg":"Cambios realizados correctamente!"}

class SeasonsModel(BaseModel):
    id: int = 0
    playlist_id: str
    name: str
    delete: bool = False

@app.post('/iuseason', tags=["core"])
def iuseason(se: SeasonsModel, user: dict = Depends(require_auth)):
    if not se.name:
        return {"error":"Debe introducir la descripcion!"}
    conn = getConnection(); cur = conn.cursor()
    if se.id == 0:
        cur.execute("insert into lacajita_season(playlist_id, title) values(%s,%s)", (se.playlist_id, se.name))
    else:
        if not se.delete:
            cur.execute("update lacajita_season set title=%s where id=%s", (se.name, se.id))
        else:
            cur.execute("""delete from lacajita_season
                           where id=%s and not exists(select * from lacajita_videos where season_id=%s)""",
                        (se.id, se.id))
    conn.commit(); cur.close(); conn.close()

@app.get('/allsegments', tags=["core"])
def getSegments_all(user: dict = Depends(require_auth)):
    conn = getConnection(); cur = conn.cursor(dictionary=True)
    cur.execute('select * from lacajita_segments order by order_')
    seg = cur.fetchall()
    cur.close(); conn.close()
    return seg

class SegmentsOrder(BaseModel):
    arrorder: list

@app.post('/usegments', tags=["core"])
def updateSegments(se: SegmentsOrder, user: dict = Depends(require_auth)):
    conn = getConnection(); cur = conn.cursor()
    for l in se.arrorder:
        cur.execute('update lacajita_segments set order_=%s where id=%s', (l['order_'], l['id']))
        conn.commit()
    cur.close(); conn.close()

@app.get('/homecarousel', tags=["core"])
def getHomecarousel(user: dict = Depends(require_auth)):
    conn = getConnection(); cur = conn.cursor(dictionary=True)
    cur.execute('SELECT * FROM lacajita_home_carousel order by id')
    seg = cur.fetchall()
    cur.close(); conn.close()
    return seg

class Homecarousel(BaseModel):
    id: int = 0
    link: Optional[str] = None
    imgsrc: Optional[str] = None
    video: Optional[str] = None
    muted: Optional[bool] = False

    @validator('link', pre=True, always=True)
    def _normalize_link(cls, v):
        # Aceptar null o cadena vacía como ausencia de link
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s if s != "" else None
        # Coerce other types to string (defensive)
        try:
            s = str(v).strip()
            return s if s != "" else None
        except Exception:
            return None

@app.post('/idhomecarousel', tags=["core"])
def idHomecarousel(hc: Homecarousel, user: dict = Depends(require_auth)):
    # Delete flow: client sends id>0 to request deletion
    if hc.id > 0:
        conn = getConnection(); cur = conn.cursor()
        cur.execute('delete from lacajita_home_carousel where id=%s', (hc.id,))
        conn.commit(); cur.close(); conn.close()
        return {"msg": "Eliminado"}

    # Validate that at least one of imgsrc or video is present
    if not (hc.imgsrc or hc.video):
        raise HTTPException(status_code=400, detail="Debe introducir el tipo de link (imgsrc o video)")

    # Defensive coercion for muted -> store as 0/1
    muted_val = 1 if bool(hc.muted) else 0

    conn = getConnection(); cur = conn.cursor()
    cur.execute(
        'insert into lacajita_home_carousel (link, imgsrc, video, muted) values(%s,%s,%s,%s)',
        (hc.link, hc.imgsrc, hc.video, muted_val)
    )
    conn.commit(); cur.close(); conn.close()
    return {"msg": "Insertado"}
# --- MIGRACIÓN SQL ---
# Ejecuta en MySQL:
# ALTER TABLE lacajita_home_carousel ADD COLUMN muted TINYINT(1) NOT NULL DEFAULT 0;

# ================== Gestión de Imágenes (protegido) ==================

@app.get("/images", tags=["images"])
def list_images(user: dict = Depends(require_auth)):
    """
    Lista archivos de la carpeta ./img filtrados por extensiones permitidas.
    """
    base = Path(UPLOAD_DIR)
    items: List[Dict[str, Any]] = []
    for f in base.iterdir():
        if f.is_file() and f.suffix.lower() in ALLOWED_IMAGE_EXTS:
            stat = f.stat()
            items.append({
                "filename": f.name,
                "size_bytes": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })
    items.sort(key=lambda x: x["filename"])
    return {"images": items}

@app.get("/images/{filename}", tags=["images"])
def get_image_file(filename: str, user: dict = Depends(require_auth)):
    """
    Devuelve un archivo específico desde ./img (validando nombre y extensión).
    """
    safe_name = _sanitize_filename(filename)
    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=400, detail="Extensión no permitida")
    file_path = Path(UPLOAD_DIR) / safe_name
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return FileResponse(file_path)

@app.post("/upload-image", tags=["images"])
async def upload_image(plid: str = Form(...), file: UploadFile = File(...), user: dict = Depends(require_auth)):
    """
    Subida de imagen (compatibilidad con UI actual): guarda como <plid>.jpeg.
    Valida nombre, tamaño y tipo básico.
    """
    # Validar nombre
    plid_safe = _sanitize_filename(plid)

    # Validar tamaño (lee todo; límite por defecto 15MB, configurable por env MAX_UPLOAD_MB)
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Archivo supera el límite de {MAX_UPLOAD_MB}MB")

    # Validar tipo por extensión original (opcional) y por content_type básico
    orig_ext = Path(file.filename or "").suffix.lower()
    if orig_ext and orig_ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=400, detail="Extensión de origen no permitida")
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Tipo de contenido no válido")

    # Guardar siempre como .jpeg (mantiene contrato existente)
    filename = f"{plid_safe}.jpeg"
    file_path = Path(UPLOAD_DIR) / filename
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    return {"msg": "File uploaded successfully", "filename": filename}

# Compatibilidad: endpoint existente que busca <filename>.jpeg
@app.get("/getcover", tags=["images"])
def get_image(filename: str = Query(..., description="Name without extension"),
              user: dict = Depends(require_auth)):
    safe_name = _sanitize_filename(filename)
    file_path = Path(UPLOAD_DIR) / f"{safe_name}.jpeg"
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    if file_path.suffix.lower() not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=400, detail="Invalid image format")
    return FileResponse(file_path)

# ---------- Health ----------
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "La Cajita TV Core_M",
        "version": "1.0.0-auth0",
        "timestamp": datetime.utcnow().isoformat(),
    }
# ================== FIN ==================