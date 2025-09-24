# Core_M_cajita.py
# API La Cajita TV (MySQL) + Auth0 (idéntico a app.py) + endpoints
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Query, Depends, Header, status
from starlette.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.openapi.utils import get_openapi
from starlette.datastructures import CommaSeparatedStrings
from pydantic import BaseModel
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


# Registrar la ruta cuando la aplicación FastAPI exista (se hace tras crear `app`).

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
                if key.get("kty") != "RSA":
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                        detail="Clave con tipo inesperado. Se requiere 'RSA'.")
                if not key.get("n") or not key.get("e"):
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                        detail="Clave RSA incompleta (falta 'n' o 'e').")
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

# --------- OpenAPI con botón Authorize ----------
app = FastAPI(
    title="La Cajita TV API",
    version="1.0.0",
    description=(
        "API para categorías, segmentos, playlists, seasons y videos.\n\n"
        "Autenticación: **Auth0 JWT (RS256)** con audience "
        f"`{AUTH0_API_AUDIENCE}`.\n"
    ),
    openapi_version="3.1.0",
    # Importante: mover docs y openapi a /api/* para que el túnel los dirija al backend
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
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

# Middleware: strip leading /api prefix so proxied requests to /api/* match existing endpoints
@app.middleware("http")
async def strip_api_prefix(request: Request, call_next):
    path = request.url.path or ""
    # No recortar para endpoints de documentación/OpenAPI
    if path.startswith("/api/docs") or path.startswith("/api/openapi.json"):
        return await call_next(request)

    if path.startswith("/api/"):
        # mutate scope so routing resolves against the trimmed path
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
    id:int = 0
    link:str
    imgsrc: Optional[str] = None
    video: Optional[str] = None

@app.post('/idhomecarousel', tags=["core"])
def idHomecarousel(hc: Homecarousel, user: dict = Depends(require_auth)):
    if hc.id > 0:
        conn = getConnection(); cur = conn.cursor()
        cur.execute('delete from lacajita_home_carousel where id=%s', (hc.id,))
        conn.commit(); cur.close(); conn.close()
        return {"msg":"Eliminado"}
    if not hc.link:
        return {"error":"Debe introducir el link a redireccionar!"}
    if not (hc.imgsrc or hc.video):
        return {"error":"Debe introducir el tipo de link!"}
    conn = getConnection(); cur = conn.cursor()
    cur.execute('insert into lacajita_home_carousel (link, imgsrc, video) values(%s,%s,%s)',
                (hc.link, hc.imgsrc, hc.video))
    conn.commit(); cur.close(); conn.close()
    return {"msg":"Insertado"}

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
