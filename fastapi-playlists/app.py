from fastapi import FastAPI, HTTPException, status, Request, Response, Header, Depends, Query, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta
import requests  # para el proxy de LiveTV y JWKS de Auth0
from jose import jwt as jose_jwt
from jose.exceptions import JWTError as JoseJWTError, ExpiredSignatureError as JoseExpiredSignatureError
from functools import lru_cache
from dotenv import load_dotenv
import os
import sentry_sdk
import logging
import json
from fastapi.middleware.cors import CORSMiddleware

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cargar variables de entorno desde .env
load_dotenv(dotenv_path=".env")

# ——— Configuración de Sentry para monitoreo ——————————————————
sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", "https://f1d0b347424ccd9c9d96e5bc1c030d3b@o4508162202009600.ingest.us.sentry.io/4509480680947712"),  # Configuración para capturar datos de performance y errores
    traces_sample_rate=0.3,  # 30% de las transacciones para performance monitoring
    profiles_sample_rate=0.3,  # 30% de las transacciones para profiling
    # Incluir datos de headers y IP de usuarios para debugging
    send_default_pii=True,
    # Configuración específica para FastAPI
    integrations=[],
    # Environment y release tags
    environment=os.getenv("DEV_ENVIRONMENT", "production"),
    release=os.getenv("RELEASE", "v1.0.0-auth0"),
)

# SECRET_KEY ya no se usará para la validación de tokens de Auth0, pero podría ser útil para otras cosas.
SECRET_KEY = os.getenv("SECRET_KEY")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME", "db_jeturing")

# Variables para Auth0
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_API_AUDIENCE = os.getenv("AUTH0_API_AUDIENCE")
ALGORITHMS = ["RS256"]

# URL para LiveTV API
LIVETV_API_URL = os.getenv("LIVETV_API_URL", "https://cajita.concepcion.tech/live-tvs?_sort=number:asc")

# API Externa Config
API_BASE_URL = os.getenv("API_BASE_URL", "https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us")

# ---- Auth0 Management API Config ----
AUTH0_MGMT_CLIENT_ID = os.getenv("AUTH0_MGMT_CLIENT_ID")
AUTH0_MGMT_CLIENT_SECRET = os.getenv("AUTH0_MGMT_CLIENT_SECRET")

#if not DB_PASSWORD:
#    raise RuntimeError("DB_PASSWORD no está definido en .env")
if not AUTH0_DOMAIN:
    raise RuntimeError("AUTH0_DOMAIN no está definido en .env. Necesario para la autenticación.")
if not AUTH0_API_AUDIENCE:
    raise RuntimeError("AUTH0_API_AUDIENCE no está definido en .env. Necesario para la autenticación.")
if not AUTH0_MGMT_CLIENT_ID or not AUTH0_MGMT_CLIENT_SECRET:
    raise RuntimeError("Faltan credenciales Auth0 Management en .env")

# Nuevas variables configurables (override desde .env)
AUTH0_MGMT_AUDIENCE = os.getenv("AUTH0_MGMT_AUDIENCE", f"https://{AUTH0_DOMAIN}/api/v2/")
# Cliente ROPG (separado del Management client). Opcional: si no está, se hará fallback al Management client (no recomendado en producción).
AUTH0_ROPG_CLIENT_ID = os.getenv("AUTH0_ROPG_CLIENT_ID")
AUTH0_ROPG_CLIENT_SECRET = os.getenv("AUTH0_ROPG_CLIENT_SECRET")

# ——— Configuración de la aplicación FastAPI ——————————————————
app = FastAPI(
    title="La Cajita TV API",
    description="""
    ## API REST para La Cajita TV

    Esta API proporciona endpoints para gestionar:
    * **Home Carousel** - Contenido destacado en la página principal
    * **Segments** - Categorías y segmentos de contenido
    * **Playlists** - Listas de reproducción de contenido
    * **Seasons** - Temporadas de series y contenido episódico
    * **Videos** - Gestión de videos individuales

    ### Autenticación

    Todos los endpoints requieren autenticación mediante **Auth0 JWT tokens**. Para obtener un token:

    ```bash
    curl --request POST \\
         --url https://segrd.us.auth0.com/oauth/token \\
         --header 'content-type: application/json' \\
         --data '{ "client_id":"Token", "client_secret":"TOKEN_DE_CLIENT_SECRET", "audience":"https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us/api", "grant_type":"credentials" }'
    ```

    Luego incluye el token en el header:

    ```
    Authorization: Bearer {token}
    ```
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=[
        {
            "name": "authentication",
            "description": "Endpoints de autenticación y usuario",
        },
        {
            "name": "homecarousel",
            "description": "Gestión del carrusel de la página principal",
        },
        {
            "name": "segments",
            "description": "Gestión de segmentos y categorías",
        },
        {
            "name": "playlists",
            "description": "Gestión de playlists de contenido",
        },
        {
            "name": "seasons",
            "description": "Gestión de temporadas",
        },
        {
            "name": "videos",
            "description": "Gestión de videos individuales",
        },
        {
            "name": "playlist",
            "description": "Endpoint especial para obtener playlist completa con relaciones",
        },
        {
            "name": "external-api",
            "description": "Endpoints proxy para API externa",
        },
        {
            "name": "health",
            "description": "Endpoints de health check y monitoreo",
        },
    ],
)

# Registrar middleware CORS después de que la app exista
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ✅ permite todos los orígenes
    allow_methods=["*"],  # GET, POST, PUT, DELETE, OPTIONS, etc.
    allow_headers=["*"],  # Authorization, Content-Type, etc.
    allow_credentials=False,  # 🚫 cookies/sesiones (no las usas)
)

@app.on_event("startup")
def check_database_tables_on_startup():
    """Verifica tablas críticas al inicio y loggea advertencias si faltan.
    Esto ayuda a diagnosticar 500s debidos a nombres de tablas inconsistentes (ej: lacajita_season vs lacajita_seasons).
    """
    try:
        conn = None
        try:
            conn = get_connection()
        except Exception as e:
            logger.error(f"Startup DB check: no se pudo conectar a MySQL: {e}")
            return

        cursor = conn.cursor()

        critical_tables = [
            'lacajita_home_carousel',
            'lacajita_segments',
            'lacajita_playlists',
            'lacajita_season',
            'lacajita_seasons',
            'lacajita_videos',
            'lacajita_categories'
        ]

        cursor.execute("SHOW TABLES")
        existing = {row[0] for row in cursor.fetchall()}

        for t in critical_tables:
            if t not in existing:
                logger.warning(f"Startup DB check: tabla esperada no encontrada: {t}")

        cursor.close()
        conn.close()
    except Exception as e:
        logger.exception(f"Error durante la verificación de tablas en startup: {e}")

# ——— Configuración de MySQL ———————————————————
DB_CONFIG = {
    "host": DB_HOST,
    "user": DB_USER,
    "password": DB_PASSWORD,
    "database": DB_NAME,
}

def get_connection():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to MySQL: {e}")

def format_date(field_name: str, obj: dict) -> str:
    """ Formatea un campo de fecha de un objeto a formato ISO string.

    Args:
        field_name: Nombre del campo de fecha en el objeto
        obj: Diccionario que contiene el campo de fecha

    Returns:
        Fecha formateada como string ISO o el valor original si no es datetime
    """
    value = obj.get(field_name)
    if isinstance(value, datetime):
        return value.isoformat()
    return value

def iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None

# ——— Modelos Pydantic —————————————————————————
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

class LoginRequest(BaseModel):
    """Modelo para credenciales de inicio de sesión."""
    email: str
    password: str

class Auth0User(BaseModel):
    sub: str  # Auth0 user id
    email: Optional[str] = None
    name: Optional[str] = None  # Otros campos que puedan venir en el token de Auth0

class HomeCarousel(BaseModel):
    id: Optional[int] = None
    link: Optional[str] = None
    imgsrc: Optional[str] = None
    video: Optional[str] = None
    date_time: Optional[datetime] = None
    active: Optional[int] = None
    order_: Optional[int] = Field(default=None, alias="order")

class Segment(BaseModel):
    id: Optional[int] = None
    name: str
    livetv: Optional[int] = None
    order_: Optional[int] = Field(default=None, alias="order")
    active: Optional[int] = None

class Playlist(BaseModel):
    id: str
    segment_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subscription: Optional[int] = None
    subscription_cost: Optional[float] = None
    active: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Season(BaseModel):
    id: Optional[int] = None
    playlist_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    active: Optional[int] = None

class Video(BaseModel):
    season_id: int
    video_id: str
    date: Optional[datetime] = None
    active: Optional[int] = None

# ——— Modelos adicionales para respuesta completa —————————————————————————
class VideoComplete(BaseModel):
    """Video con información completa"""
    season_id: int
    video_id: str
    date: Optional[str] = None  # ISO string format
    active: Optional[int] = None

class SeasonComplete(BaseModel):
    """Season con videos incluidos"""
    id: Optional[int]
    playlist_id: str
    title: Optional[str]
    description: Optional[str]
    date: Optional[str] = None  # ISO string format
    active: Optional[int]
    videos: List[str] = []  # Lista de video_ids

class PlaylistComplete(BaseModel):
    """Playlist con seasons y videos incluidos"""
    id: str
    segment_id: Optional[int]
    title: Optional[str]
    description: Optional[str]
    category: Optional[str]
    subscription: Optional[int]
    subscription_cost: Optional[float]
    active: Optional[int]
    created_at: Optional[str] = None  # ISO string format
    updated_at: Optional[str] = None  # ISO string format
    seasons: List[SeasonComplete] = []

class LiveTVChannel(BaseModel):
    """Canal de LiveTV"""
    id: Optional[int]
    name: Optional[str]
    url: Optional[str]
    number: Optional[int]
    logo: Optional[str]

class SegmentComplete(BaseModel):
    """Segment con playlists o canales de LiveTV"""
    id: Optional[int]
    name: str
    livetv: Optional[int]
    order_: Optional[int] = Field(alias="order")
    active: Optional[int]
    playlist: Optional[List[PlaylistComplete]] = None
    livetvlist: Optional[List[LiveTVChannel]] = None

class HomeCarouselComplete(BaseModel):
    """Home carousel con formateo de fechas"""
    id: Optional[int]
    link: Optional[str]
    imgsrc: Optional[str]
    video: Optional[str]
    date_time: Optional[str] = None  # ISO string format
    active: Optional[int]
    order_: Optional[int] = Field(alias="order")

class CompletePlaylistResponse(BaseModel):
    """Respuesta completa con todos los datos estructurados"""
    homecarousel: List[HomeCarouselComplete]
    segments: List[SegmentComplete]

# ——— Validación de JWT (AHORA CON AUTH0 RS256) ——————————————————
@lru_cache()
def get_jwk_keys() -> Dict:
    """ Obtiene las claves públicas JWKS de Auth0.
    Estas claves se utilizan para verificar la firma de los JWT.
    La función está cacheada para evitar peticiones repetidas.
    """
    jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    try:
        response = requests.get(jwks_url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error crítico: No se pudo obtener el JWK de Auth0 desde {jwks_url}. Error: {e}")
        raise RuntimeError(f"No se pudo obtener el JWK de Auth0: {e}")

def verify_jwt_auth0(authorization: Optional[str] = Header(None)) -> dict:
    """ Valida el JWT usando la JWK pública de Auth0 (RS256). """
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Encabezado de autorización ausente."
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de token inválido. Debe ser 'Bearer <token>'"
        )

    token = parts[1]
    try:
        jwks = get_jwk_keys()
        unverified_header = jose_jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks["keys"]:
            if key.get("kid") == unverified_header.get("kid"):
                # Asegurarnos de que la clave sea RSA y tenga los campos esperados.
                if key.get("kty") != "RSA":
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Clave con tipo inesperado. Se requiere 'RSA'."
                    )
                if not key.get("n") or not key.get("e"):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Clave RSA incompleta (falta 'n' o 'e')."
                    )
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key.get("use"),
                    "n": key["n"],
                    "e": key["e"]
                }
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No se pudo encontrar una clave válida para el token."
            )

        payload = jose_jwt.decode(
            token,
            rsa_key,
            algorithms=ALGORITHMS,
            audience=AUTH0_API_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/"
        )
        return payload
    except JoseExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token ha expirado."
        )
    except JoseJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error en la validación del token: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error inesperado: {e}"
        )

# Dependencia para endpoints protegidos
def require_auth(token_data: dict = Depends(verify_jwt_auth0)) -> dict:
    return token_data

# ---- Auth0 Management Token ----
_mgmt_token: Optional[str] = None

def get_management_token():
    global _mgmt_token
    if _mgmt_token:
        return _mgmt_token

    url = f"https://{AUTH0_DOMAIN}/oauth/token"
    payload = {
        "client_id": AUTH0_MGMT_CLIENT_ID,
        "client_secret": AUTH0_MGMT_CLIENT_SECRET,
        "audience": AUTH0_MGMT_AUDIENCE,
        "grant_type": "client_credentials"
    }
    r = requests.post(url, json=payload, timeout=10)
    r.raise_for_status()
    _mgmt_token = r.json().get("access_token")
    return _mgmt_token

def get_auth0_user_info(token_data: dict = Depends(verify_jwt_auth0)) -> Auth0User:
    """ Convierte los datos del token en un objeto Auth0User para mayor consistencia """
    return Auth0User(
        sub=token_data.get("sub"),
        email=token_data.get("email"),
        name=token_data.get("name") or token_data.get("nickname")
    )

def get_db_connection():
    conn = get_connection()
    try:
        yield conn
    finally:
        if conn:
            conn.close()

# ——— Endpoints principales ———————————————————————
@app.get("/")
def read_root():
    return {"Hello": "La Cajita TV API con Auth0", "status": "OK"}

@app.get("/redoc-custom", response_class=HTMLResponse)
async def redoc_html():
    """ Endpoint personalizado para Redoc con tema customizado """
    html_content = """
    <!DOCTYPE html>
    <html>
      <head>
        <title>La Cajita TV API - Documentation</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" type="image/png" href="https://redocly.github.io/redoc/favicon.png">
        <style>
          body {
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <redoc
          spec-url="/openapi.json"
          theme='{
            "colors": {
              "primary": {
                "main": "#1976d2"
              }
            },
            "typography": {
              "fontSize": "14px",
              "lineHeight": "1.5em",
              "code": {
                "fontSize": "13px",
                "fontFamily": "Courier, monospace"
              },
              "headings": {
                "fontFamily": "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif",
                "fontWeight": "600"
              }
            },
            "sidebar": {
              "width": "260px",
              "backgroundColor": "#fafafa"
            }
          }'
          options='{
            "hideHostname": true,
            "expandResponses": "200,201",
            "requiredPropsFirst": true,
            "sortPropsAlphabetically": true,
            "showExtensions": true,
            "noAutoAuth": false,
            "pathInMiddlePanel": true,
            "hideDownloadButton": false,
            "scrollYOffset": 60
          }'
        >
        </redoc>
        <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
      </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

@app.get("/user/me", response_model=Auth0User, tags=["authentication"])
def get_my_profile(user_info: Auth0User = Depends(get_auth0_user_info)):
    """Endpoint para obtener el perfil del usuario autenticado desde Auth0"""
    return user_info

# ---- Endpoints Authentication ----
@app.post("/auth0/users", tags=["authentication"])
def create_auth0_user(user: Auth0UserCreate):
    """Crear un nuevo usuario en Auth0"""
    token = get_management_token()
    url = f"https://{AUTH0_DOMAIN}/api/v2/users"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.post(url, json=user.dict(), headers=headers, timeout=10)
    if resp.status_code != 201:
        raise HTTPException(status_code=resp.status_code, detail=resp.json())
    return resp.json()

@app.post("/login", tags=["authentication"])
def login_grant(email: str, password: str):
    """Login usando Resource Owner Password Grant. Recibe email y password como query parameters en un POST request."""
    url = f"https://{AUTH0_DOMAIN}/oauth/token"

    # Preferir credenciales ROPG separadas; si no están definidas, usar Management client como fallback (no ideal en producción)
    client_id = AUTH0_ROPG_CLIENT_ID or AUTH0_MGMT_CLIENT_ID
    client_secret = AUTH0_ROPG_CLIENT_SECRET or AUTH0_MGMT_CLIENT_SECRET

    data = {
        "grant_type": "password",
        "username": email,
        "password": password,
        "audience": AUTH0_API_AUDIENCE,
        "scope": "openid profile email",
        "client_id": client_id,
        "client_secret": client_secret
    }

    try:
        r = requests.post(url, json=data, timeout=10)
        r.raise_for_status()
    except requests.exceptions.HTTPError:
        logger.error(f"Login failed for {email}: {r.text}")
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

@app.post("/auth/client-credentials", response_model=TokenResponse, tags=["authentication"])
def get_client_credentials_token(request: ClientCredentialsRequest):
    """ Obtener token JWT usando Client Credentials Grant.
    Este endpoint es útil para aplicaciones backend que necesitan autenticarse sin intervención del usuario.

    Ejemplo de uso:
        bash
        curl -X POST "http://domain/auth/client-credentials" \
             -H "Content-Type: application/json" \
             -d '{"client_secret": "tu_secret_key_aqui"}'
    """
    # Verificar que el client_secret proporcionado coincida con SECRET_KEY
    if request.client_secret != SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Client secret inválido",
        )

    url = f"https://{AUTH0_DOMAIN}/oauth/token"
    data = {
        "client_id": AUTH0_MGMT_CLIENT_ID,
        "client_secret": AUTH0_MGMT_CLIENT_SECRET,
        "audience": AUTH0_API_AUDIENCE,
        "grant_type": "client_credentials",
    }

    try:
        response = requests.post(url, json=data, timeout=10)
        # Si hay error, capturar más detalles para debugging
        if response.status_code != 200:
            try:
                error_json = response.json()
            except:
                error_json = {"error": response.text}
            error_detail = {
                "status_code": response.status_code,
                "auth0_error": error_json,
                "url": url,
                "client_id": AUTH0_MGMT_CLIENT_ID,
                "audience": AUTH0_API_AUDIENCE,
                "domain": AUTH0_DOMAIN,
            }
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error de Auth0 ({response.status_code}): {error_detail}",
            )

        token_data = response.json()
        return TokenResponse(
            access_token=token_data.get("access_token"),
            token_type=token_data.get("token_type", "Bearer"),
            expires_in=token_data.get("expires_in"),
            scope=token_data.get("scope"),
            usage=f"Include in Authorization header as: Bearer {token_data.get('access_token')}",
        )
    except HTTPException:
        raise  # Re-raise HTTPException as-is
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error de conexión con Auth0: {str(e)}",
        )

# Reemplazo seguro de la función get_token_simple (anteriormente corrupta con caracteres inválidos)
def get_token_simple(client_secret: str):
    """Versión simplificada para obtener un token usando query parameter.

    Ejemplo de uso:
        GET /auth/token?client_secret=tu_secret_key_aqui

    Nota: menos seguro que el POST ya que el secret aparece en la URL.
    """
    # Verificar que el client_secret proporcionado coincida con SECRET_KEY
    if client_secret != SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Client secret inválido",
        )

    url = f"https://{AUTH0_DOMAIN}/oauth/token"
    data = {
        "client_id": AUTH0_MGMT_CLIENT_ID,
        "client_secret": AUTH0_MGMT_CLIENT_SECRET,
        "audience": AUTH0_API_AUDIENCE,
        "grant_type": "client_credentials",
    }

    try:
        response = requests.post(url, json=data, timeout=10)
        response.raise_for_status()
        token_data = response.json()
        return TokenResponse(
            access_token=token_data.get("access_token"),
            token_type=token_data.get("token_type", "Bearer"),
            expires_in=token_data.get("expires_in"),
            scope=token_data.get("scope"),
            usage=f"Include in Authorization header as: Bearer {token_data.get('access_token')}",
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo token de Auth0: {str(e)}",
        )

def get_token_simple(client_secret: str):
    """ Versión simplificada para obtener token usando query parameter. Ejemplo de uso:
    GET /auth/token?client_secret=tu_secret_key_aqui
    ⚠️ Menos seguro que el POST ya que el secret aparece en la URL """

    # Verificar que el client_secret proporcionado coincida con SECRET_KEY
    if client_secret != SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Client secret inválido",
        )

    url = f"https://{AUTH0_DOMAIN}/oauth/token"
    data = {
        "client_id": AUTH0_MGMT_CLIENT_ID,
        "client_secret": AUTH0_MGMT_CLIENT_SECRET,
        "audience": AUTH0_API_AUDIENCE,
        "grant_type": "client_credentials",
    }

    try:
        response = requests.post(url, json=data, timeout=10)
        response.raise_for_status()
        token_data = response.json()
        return TokenResponse(
            access_token=token_data.get("access_token"),
            token_type=token_data.get("token_type", "Bearer"),
            expires_in=token_data.get("expires_in"),
            scope=token_data.get("scope"),
            usage=f"Include in Authorization header as: Bearer {token_data.get('access_token')}",
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo token de Auth0: {str(e)}",
        )

@app.get("/secure-data", tags=["authentication"])
def read_secure_data(user_claims: dict = Depends(require_auth)):
    return {"message": "Datos protegidos", "user_claims": user_claims}

@app.get("/sentry-debug")
async def trigger_error():
    """ Endpoint para verificar que Sentry está funcionando correctamente. SOLO PARA TESTING - REMOVER EN PRODUCCIÓN """
    division_by_zero = 1 / 0
    return {"message": "This should not be reached"}

@app.get("/health")
def health_check():
    """Endpoint de health check para monitoreo"""
    return {
        "status": "healthy",
        "service": "La Cajita TV API",
        "version": "1.0.0-auth0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health-db", tags=["health"])
def health_db():
    """Verifica que MySQL está accesible y que la tabla lacajita_playlists existe.
    Responde con un JSON simple indicando status y conteos si es posible.
    Este endpoint está pensado para pruebas locales sin pasar por Auth0.
    """
    try:
        conn = get_connection()
    except HTTPException as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e.detail)})

    cursor = conn.cursor()
    try:
        # Intentar contar filas en la tabla de playlists
        cursor.execute("SELECT COUNT(*) FROM lacajita_playlists")
        count = cursor.fetchone()[0]
        return {"ok": True, "table": "lacajita_playlists", "count": count}
    except mysql.connector.Error:
        # Si no existe la tabla, listar tablas disponibles
        try:
            cursor.execute("SHOW TABLES")
            tables = [row[0] for row in cursor.fetchall()]
            return {"ok": True, "tables": tables}
        except Exception as e:
            return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
    finally:
        try:
            cursor.close()
        except:
            pass
        try:
            conn.close()
        except:
            pass

# ——— CRUD Home Carousel —————————————————————————
@app.get("/home-carousel", response_model=List[HomeCarousel], tags=["homecarousel"])
def get_home_carousel(
    active: Optional[int] = None,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if active is not None:
            sql = """
            SELECT id, link, imgsrc, video, date_time, active, order_ as order
            FROM lacajita_home_carousel
            WHERE active = %s
            ORDER BY order_
            """
            cursor.execute(sql, (active,))
        else:
            sql = """
            SELECT id, link, imgsrc, video, date_time, active, order_ as order
            FROM lacajita_home_carousel
            ORDER BY order_
            """
            cursor.execute(sql)

        results = cursor.fetchall()
    except Exception as e:
        # Log minimal context and raise HTTP error with message for debugging
        err = f"DB error in get_home_carousel: {str(e)}"
        print(err)
        cursor.close(); conn.close()
        raise HTTPException(status_code=500, detail=err)

    cursor.close()
    conn.close()
    return results

@app.post("/home-carousel", response_model=HomeCarousel, status_code=status.HTTP_201_CREATED, tags=["homecarousel"])
def create_home_carousel(
    item: HomeCarousel,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    INSERT INTO lacajita_home_carousel (link, imgsrc, video, date_time, active, order_)
    VALUES (%s, %s, %s, NOW(), %s, %s)
    """, (item.link, item.imgsrc, item.video, item.active or 1, item.order_ or 0))
    conn.commit()
    new_id = cursor.lastrowid
    cursor.execute("""
    SELECT id, link, imgsrc, video, date_time, active, order_ as order
    FROM lacajita_home_carousel
    WHERE id = %s
    """, (new_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result

@app.get("/home-carousel/{item_id}", response_model=HomeCarousel, tags=["homecarousel"])
def get_home_carousel_item(
    item_id: int,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    SELECT id, link, imgsrc, video, date_time, active, order_ as order
    FROM lacajita_home_carousel
    WHERE id = %s
    """, (item_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Home carousel item not found")
    return result

@app.put("/home-carousel/{item_id}", response_model=HomeCarousel, tags=["homecarousel"])
def update_home_carousel(
    item_id: int,
    item: HomeCarousel,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    UPDATE lacajita_home_carousel
    SET link = %s, imgsrc = %s, video = %s, active = %s, order_ = %s
    WHERE id = %s
    """, (item.link, item.imgsrc, item.video, item.active, item.order_, item_id))
    conn.commit()
    cursor.execute("""
    SELECT id, link, imgsrc, video, date_time, active, order_ as order
    FROM lacajita_home_carousel
    WHERE id = %s
    """, (item_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Home carousel item not found")
    return result

@app.delete("/home-carousel/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["homecarousel"])
def delete_home_carousel(
    item_id: int,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lacajita_home_carousel WHERE id = %s", (item_id,))
    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Home carousel item not found")
    conn.commit()
    cursor.close()
    conn.close()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# ——— CRUD Segments —————————————————————————————
@app.get("/segments", response_model=List[Segment], tags=["segments"])
def get_segments(
    active: Optional[int] = None,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if active is not None:
            sql = """
            SELECT id, name, livetv, order_ as order, active
            FROM lacajita_segments
            WHERE active = %s
            ORDER BY order_
            """
            cursor.execute(sql, (active,))
        else:
            sql = """
            SELECT id, name, livetv, order_ as order, active
            FROM lacajita_segments
            ORDER BY order_
            """
            cursor.execute(sql)

        results = cursor.fetchall()
    except Exception as e:
        err = f"DB error in get_segments: {str(e)}"
        print(err)
        cursor.close(); conn.close()
        raise HTTPException(status_code=500, detail=err)

    cursor.close()
    conn.close()
    return results

@app.post("/segments", response_model=Segment, status_code=status.HTTP_201_CREATED, tags=["segments"])
def create_segment(
    item: Segment,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    INSERT INTO lacajita_segments (name, livetv, order_, active)
    VALUES (%s, %s, %s, %s)
    """, (item.name, item.livetv or 0, item.order_ or 0, item.active or 1))
    conn.commit()
    new_id = cursor.lastrowid
    cursor.execute("""
    SELECT id, name, livetv, order_ as order, active
    FROM lacajita_segments
    WHERE id = %s
    """, (new_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result

@app.get("/segments/{item_id}", response_model=Segment, tags=["segments"])
def get_segment(
    item_id: int,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    SELECT id, name, livetv, order_ as order, active
    FROM lacajita_segments
    WHERE id = %s
    """, (item_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Segment not found")
    return result

@app.put("/segments/{item_id}", response_model=Segment, tags=["segments"])
def update_segment(
    item_id: int,
    item: Segment,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    UPDATE lacajita_segments
    SET name = %s, livetv = %s, order_ = %s, active = %s
    WHERE id = %s
    """, (item.name, item.livetv, item.order_, item.active, item_id))
    conn.commit()
    cursor.execute("""
    SELECT id, name, livetv, order_ as order, active
    FROM lacajita_segments
    WHERE id = %s
    """, (item_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Segment not found")
    return result

@app.delete("/segments/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["segments"])
def delete_segment(
    item_id: int,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lacajita_segments WHERE id = %s", (item_id,))
    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Segment not found")
    conn.commit()
    cursor.close()
    conn.close()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# ——— CRUD Playlists ——————————————————————————————
"""@app.get("/playlists", response_model=List[Playlist], tags=["playlists"])
def get_playlists(
    active: Optional[int] = None,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    if active is not None:
        cursor.execute("SELECT id, segment_id, title, description, category, subscription, subscription_cost, active, created_at, updated_at FROM lacajita_playlists WHERE active = %s ORDER BY created_at DESC", (active,))
    else:
        cursor.execute("SELECT id, segment_id, title, description, category, subscription, subscription_cost, active, created_at, updated_at FROM lacajita_playlists ORDER BY created_at DESC")
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return results"""
@app.get("/playlists", tags=["playlists"])
def get_playlists(
    active: Optional[int] = None,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    livetv = []
    try:
        respose = requests.get(LIVETV_API_URL)
        if respose.status_code==200:
            livetv = respose.json()
            # print(json.dumps(livetv, indent=2))
        else:
            print("comunication error {respose.status_code}")
    except requests.exceptions.RequestException as err:
        print("catch error: {err}")

    cursor.execute("SELECT * FROM lacajita_home_carousel order by order_")
    homecarousel = cursor.fetchall()
    cursor.execute("SELECT * FROM lacajita_segments where active = 1 order by order_")
    segments = cursor.fetchall()
    cursor.execute("SELECT * FROM lacajita_playlists where active = 1 and segment_id in(select id from lacajita_segments where active = 1) order by updated_at")
    playlist = cursor.fetchall()
    cursor.execute("SELECT * FROM lacajita_categories")
    categories = cursor.fetchall()
    cursor.execute("SELECT * FROM lacajita_playlist_categories")
    playlist_categories = cursor.fetchall()
    cursor.execute("SELECT * FROM lacajita_season where active=1 order by date desc")
    seasons = cursor.fetchall()
    cursor.execute("SELECT * FROM lacajita_videos where active=1 order by date desc")
    videos = cursor.fetchall()

    jsonarr = {"homecarousel":[],"segments":[],"categories":[]}

    for home in homecarousel:
        home['video'] = "" if home['video']== None else home["video"]
        home['imgsrc'] = "" if home['imgsrc']== None else home["imgsrc"]
        home['date_time'] = format_date('date_time',home)

    jsonarr['homecarousel'] = homecarousel
    jsonarr['categories'] = categories

    for sgm in segments:
        plst = []
        for pl in playlist:
            if pl['segment_id']==sgm['id']:
                pl['created_at'] = format_date('created_at',pl)
                pl['updated_at'] = format_date('updated_at',pl)
                seas = []
                for se in seasons:
                    if se['playlist_id']==pl['id']:
                        se['date'] = format_date('date',se)
                        vid = [];
                        for vi in videos:
                            if vi['season_id']==se['id']:
                                vi['date'] = format_date('date',vi)
                                vid.append(vi['video_id'])
                        se['videos'] = vid; seas.append(se)

                pc = []
                for plca in playlist_categories:
                    if plca['id_playlist']==pl['id']:
                        pc.append(plca['id_category'])
                pl['categories'] = pc
                pl['seasons'] = seas
                plst.append(pl)

        pltv = 'livetvlist' if sgm['livetv']==1 else'playlist'
        sgm[pltv] = plst

        if pltv=='livetvlist':
            sgm['livetvlist'] = livetv

    jsonarr['segments'] = segments

    cursor.close()
    conn.close()
    return jsonarr

# ——— CRUD Playlists ——————————————————————————————
@app.get("/playlists", response_model=CompletePlaylistResponse, tags=["playlists"])
def get_complete_playlist_data(
    user_claims: dict = Depends(require_auth)
):
    """ Obtener estructura completa de datos incluyendo:
    - Home carousel
    - Segments con sus playlists anidadas
    - Seasons con sus videos
    - Canales de LiveTV para segments de tipo LiveTV

    Este endpoint reemplaza la funcionalidad del endpoint Flask legacy '/playlist'
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Home carousel activo
        cursor.execute("""
        SELECT id, link, imgsrc, video, date_time, active, order_ as order
        FROM lacajita_home_carousel
        ORDER BY order_
        """)
        homecarousel = cursor.fetchall()

        # Segments activos
        cursor.execute("""
        SELECT id, name, livetv, order_ as order, active
        FROM lacajita_segments
        WHERE active = 1
        ORDER BY order_
        """)
        segments = cursor.fetchall()

        # Playlists activas de segments activos
        cursor.execute("""
        SELECT id, segment_id, title, description, category, subscription, subscription_cost, active, created_at, updated_at
        FROM lacajita_playlists
        WHERE active = 1 AND segment_id IN (SELECT id FROM lacajita_segments WHERE active = 1)
        ORDER BY updated_at DESC
        """)
        playlists = cursor.fetchall()

        # Seasons activas
        cursor.execute("""
        SELECT id, playlist_id, title, description, date, active
        FROM lacajita_season
        WHERE active = 1
        ORDER BY date DESC
        """)
        seasons = cursor.fetchall()

        # Videos activos
        cursor.execute("""
        SELECT season_id, video_id, date, active
        FROM lacajita_videos
        WHERE active = 1
        ORDER BY date DESC
        """)
        videos = cursor.fetchall()

        # Función helper para formatear fechas
        def format_datetime_to_iso(dt):
            if dt is None:
                return None
            if isinstance(dt, datetime):
                return dt.isoformat()
            return str(dt)

        # Procesar homecarousel
        processed_homecarousel = []
        for home in homecarousel:
            processed_home = dict(home)
            processed_home['video'] = "" if processed_home['video'] is None else processed_home["video"]
            processed_home['imgsrc'] = "" if processed_home['imgsrc'] is None else processed_home["imgsrc"]
            processed_home['date_time'] = format_datetime_to_iso(processed_home['date_time'])
            processed_homecarousel.append(processed_home)

        # Obtener lista de LiveTV
        livetv_list = []
        try:
            response = requests.get(LIVETV_API_URL, timeout=5)
            if response.status_code == 200:
                livetv_data = response.json()
                # Formatear datos de LiveTV según el modelo
                for channel in livetv_data:
                    livetv_list.append({
                        "id": channel.get("id"),
                        "name": channel.get("name"),
                        "url": channel.get("url"),
                        "number": channel.get("number"),
                        "logo": channel.get("logo")
                    })
        except Exception as e:
            print(f"Error obteniendo LiveTV: {e}")
            livetv_list = []

        # Procesar segments con sus playlists anidadas
        processed_segments = []
        for sgm in segments:
            segment_dict = dict(sgm)
            if segment_dict['livetv'] == 1:
                # Si es LiveTV, agregar la lista de canales
                segment_dict['livetvlist'] = livetv_list
                segment_dict['playlist'] = None
            else:
                # Si no es LiveTV, agregar playlists con sus seasons y videos
                segment_playlists = []
                for pl in playlists:
                    if pl['segment_id'] == segment_dict['id']:
                        playlist_dict = dict(pl)
                        # Formatear fechas de playlist
                        playlist_dict['created_at'] = format_datetime_to_iso(playlist_dict['created_at'])
                        playlist_dict['updated_at'] = format_datetime_to_iso(playlist_dict['updated_at'])

                        # Obtener seasons de esta playlist
                        playlist_seasons = []
                        for se in seasons:
                            if se['playlist_id'] == pl['id']:
                                season_dict = dict(se)
                                season_dict['date'] = format_datetime_to_iso(season_dict['date'])

                                # Obtener videos de esta season
                                season_videos = []
                                for vi in videos:
                                    if vi['season_id'] == se['id']:
                                        season_videos.append(vi['video_id'])

                                # Agregar videos a la season
                                season_dict['videos'] = season_videos
                                playlist_seasons.append(season_dict)

                        # Agregar seasons a la playlist
                        playlist_dict['seasons'] = playlist_seasons
                        segment_playlists.append(playlist_dict)

                segment_dict['playlist'] = segment_playlists
                segment_dict['livetvlist'] = None

            processed_segments.append(segment_dict)

        return CompletePlaylistResponse(
            homecarousel=processed_homecarousel,
            segments=processed_segments
        )
    except Exception as e:
        print(f"Error en get_complete_playlist_data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo datos completos: {str(e)}"
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ——— Alias legacy: /playlist ——————————————————————————————
@app.get("/playlist", response_model=CompletePlaylistResponse, tags=["playlist"])
def get_legacy_playlist(user_claims: dict = Depends(require_auth)):
    """Alias legacy que devuelve la misma respuesta que /playlists, sin redirección.

    Mantiene contratos de clientes antiguos (Flask legacy `/playlist`).
    """
    # Reutiliza la función que arma toda la estructura
    return get_complete_playlist_data(user_claims=user_claims)

@app.post("/playlists", response_model=Playlist, status_code=status.HTTP_201_CREATED, tags=["playlists"])
def create_playlist(
    item: Playlist,
    user_claims: dict = Depends(require_auth)
):
    """Crear una nueva playlist"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    INSERT INTO lacajita_playlists (id, segment_id, title, description, category, subscription, subscription_cost, active, created_at, updated_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
    """, (item.id, item.segment_id, item.title, item.description, item.category, item.subscription or 0, item.subscription_cost, item.active or 1))
    conn.commit()
    cursor.execute("SELECT id, segment_id, title, description, category, subscription, subscription_cost, active, created_at, updated_at FROM lacajita_playlists WHERE id = %s", (item.id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result

@app.get("/playlists/{item_id}", response_model=Playlist, tags=["playlists"])
def get_playlist(
    item_id: str,
    user_claims: dict = Depends(require_auth)
):
    """Obtener una playlist específica por ID"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, segment_id, title, description, category, subscription, subscription_cost, active, created_at, updated_at FROM lacajita_playlists WHERE id = %s", (item_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return result

@app.put("/playlists/{item_id}", response_model=Playlist, tags=["playlists"])
def update_playlist(
    item_id: str,
    item: Playlist,
    user_claims: dict = Depends(require_auth)
):
    """Actualizar una playlist existente"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    # Verificar que la playlist existe antes de actualizar
    cursor.execute("SELECT id FROM lacajita_playlists WHERE id = %s", (item_id,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Playlist not found")

    cursor.execute("""
    UPDATE lacajita_playlists
    SET segment_id = %s, title = %s, description = %s, category = %s, subscription = %s, subscription_cost = %s, active = %s, updated_at = NOW()
    WHERE id = %s
    """, (item.segment_id, item.title, item.description, item.category, item.subscription, item.subscription_cost, item.active, item_id))
    conn.commit()
    cursor.execute("SELECT id, segment_id, title, description, category, subscription, subscription_cost, active, created_at, updated_at FROM lacajita_playlists WHERE id = %s", (item_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result

@app.delete("/playlists/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["playlists"])
def delete_playlist(
    item_id: str,
    user_claims: dict = Depends(require_auth)
):
    """Eliminar una playlist"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lacajita_playlists WHERE id = %s", (item_id,))
    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Playlist not found")
    conn.commit()
    cursor.close()
    conn.close()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# ——— CRUD Seasons ——————————————————————————————
@app.get("/seasons", response_model=List[Season], tags=["seasons"])
def get_seasons(
    active: Optional[int] = None,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if active is not None:
            sql = "SELECT id, playlist_id, title, description, date, active FROM lacajita_season WHERE active = %s ORDER BY date DESC"
            cursor.execute(sql, (active,))
        else:
            sql = "SELECT id, playlist_id, title, description, date, active FROM lacajita_season ORDER BY date DESC"
            cursor.execute(sql)

        results = cursor.fetchall()
    except Exception as e:
        err = f"DB error in get_seasons: {str(e)}"
        print(err)
        cursor.close(); conn.close()
        raise HTTPException(status_code=500, detail=err)

    cursor.close()
    conn.close()
    return results

@app.post("/seasons", response_model=Season, status_code=status.HTTP_201_CREATED, tags=["seasons"])
def create_season(
    item: Season,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    INSERT INTO lacajita_season (playlist_id, title, description, date, active)
    VALUES (%s, %s, %s, %s, %s)
    """, (item.playlist_id, item.title, item.description, item.date or datetime.utcnow(), item.active or 1))
    conn.commit()
    new_id = cursor.lastrowid
    cursor.execute("SELECT id, playlist_id, title, description, date, active FROM lacajita_season WHERE id = %s", (new_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result

@app.get("/seasons/{item_id}", response_model=Season, tags=["seasons"])
def get_season(
    item_id: int,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, playlist_id, title, description, date, active FROM lacajita_season WHERE id = %s", (item_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Season not found")
    return result

@app.put("/seasons/{item_id}", response_model=Season, tags=["seasons"])
def update_season(
    item_id: int,
    item: Season,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    UPDATE lacajita_season
    SET playlist_id = %s, title = %s, description = %s, date = %s, active = %s
    WHERE id = %s
    """, (item.playlist_id, item.title, item.description, item.date, item.active, item_id))
    conn.commit()
    cursor.execute("SELECT id, playlist_id, title, description, date, active FROM lacajita_season WHERE id = %s", (item_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Season not found")
    return result

@app.delete("/seasons/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["seasons"])
def delete_season(
    item_id: int,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lacajita_season WHERE id = %s", (item_id,))
    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Season not found")
    conn.commit()
    cursor.close()
    conn.close()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# ——— CRUD Videos ——————————————————————————————
@app.get("/videos", response_model=List[Video], tags=["videos"])
def get_videos(
    active: Optional[int] = None,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    if active is not None:
        cursor.execute("SELECT season_id, video_id, date, active FROM lacajita_videos WHERE active = %s ORDER BY date DESC", (active,))
    else:
        cursor.execute("SELECT season_id, video_id, date, active FROM lacajita_videos ORDER BY date DESC")
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return results

@app.post("/videos", response_model=Video, status_code=status.HTTP_201_CREATED, tags=["videos"])
def create_video(
    item: Video,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    INSERT INTO lacajita_videos (season_id, video_id, date, active)
    VALUES (%s, %s, %s, %s)
    """, (item.season_id, item.video_id, item.date or datetime.utcnow(), item.active or 1))
    conn.commit()
    cursor.execute("SELECT season_id, video_id, date, active FROM lacajita_videos WHERE season_id = %s AND video_id = %s", (item.season_id, item.video_id))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result

@app.get("/videos/{season_id}/{video_id}", response_model=Video, tags=["videos"])
def get_video(
    season_id: int,
    video_id: str,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT season_id, video_id, date, active FROM lacajita_videos WHERE season_id = %s AND video_id = %s", (season_id, video_id))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Video not found")
    return result

@app.put("/videos/{season_id}/{video_id}", response_model=Video, tags=["videos"])
def update_video(
    season_id: int,
    video_id: str,
    item: Video,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    UPDATE lacajita_videos
    SET date = %s, active = %s
    WHERE season_id = %s AND video_id = %s
    """, (item.date, item.active, season_id, video_id))
    conn.commit()
    cursor.execute("SELECT season_id, video_id, date, active FROM lacajita_videos WHERE season_id = %s AND video_id = %s", (season_id, video_id))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Video not found")
    return result

@app.delete("/videos/{season_id}/{video_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["videos"])
def delete_video(
    season_id: int,
    video_id: str,
    user_claims: dict = Depends(require_auth)
):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lacajita_videos WHERE season_id = %s AND video_id = %s", (season_id, video_id))
    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Video not found")
    conn.commit()
    cursor.close()
    conn.close()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# ——— Endpoint Especial /playlist ———————————————————————
# Mejorar el endpoint principal de playlists
@app.get("/playlists", response_model=CompletePlaylistResponse, tags=["playlists"])
def get_complete_playlist_data(
    authorization: Optional[str] = Header(None),
    user_claims: dict = Depends(require_auth)
):
    """ Obtener estructura completa de datos incluyendo:
    - Home carousel
    - Segments con sus playlists anidadas
    - Seasons con sus videos
    - Canales de LiveTV para segments de tipo LiveTV

    Este endpoint reemplaza la funcionalidad del endpoint Flask legacy '/playlist'
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Obtener home carousel
        cursor.execute("""
        SELECT id, link, imgsrc, video, date_time, active, order_ as order
        FROM lacajita_home_carousel
        ORDER BY order_
        """)
        homecarousel = cursor.fetchall()
        # Formatear fechas en carousel
        for item in homecarousel:
            item['video'] = item['video'] or ""
            item['imgsrc'] = item['imgsrc'] or ""
            if item['date_time']:
                item['date_time'] = format_date('date_time', item)

        # Obtener segments activos
        cursor.execute("""
        SELECT id, name, livetv, order_ as order, active
        FROM lacajita_segments
        WHERE active = 1
        ORDER BY order_
        """)
        segments = cursor.fetchall()

        # Obtener playlists activas
        cursor.execute("""
        SELECT id, segment_id, title, description, category, subscription, subscription_cost, active, created_at, updated_at
        FROM lacajita_playlists
        WHERE active = 1 AND segment_id IN (SELECT id FROM lacajita_segments WHERE active = 1)
        ORDER BY updated_at DESC
        """)
        playlists = cursor.fetchall()

        # Obtener seasons activas
        cursor.execute("""
        SELECT id, playlist_id, title, description, date, active
        FROM lacajita_season
        WHERE active = 1
        ORDER BY date DESC
        """)
        seasons = cursor.fetchall()

        # Obtener videos activos
        cursor.execute("""
        SELECT video_id, season_id, title, description, date, active
        FROM lacajita_videos
        WHERE active = 1
        ORDER BY date DESC
        """)
        videos = cursor.fetchall()

        # Obtener canales LiveTV si es necesario
        cursor.execute("""
        SELECT id, name, url, number, logo
        FROM livetv_channels
        WHERE active = 1
        ORDER BY number
        """)
        livetv_channels = cursor.fetchall()

        # Estructurar los datos
        for segment in segments:
            # Filtrar playlists para este segment
            segment_playlists = [ pl for pl in playlists if pl['segment_id'] == segment['id'] ]
            # Procesar cada playlist
            for playlist in segment_playlists:
                # Formatear fechas
                playlist['created_at'] = format_date('created_at', playlist)
                playlist['updated_at'] = format_date('updated_at', playlist)
                playlist['seasons'] = []
                if include_seasons:
                    # Obtener seasons para esta playlist
                    cursor.execute("""
                    SELECT id, playlist_id, title, description, date, active
                    FROM lacajita_season
                    WHERE playlist_id = %s AND active = 1
                    ORDER BY date DESC
                    """, (playlist['id'],))
                    seasons = cursor.fetchall()
                    for season in seasons:
                        season['date'] = format_date('date', season)
                        # Obtener videos de esta season
                        season_videos = []
                        for vi in videos:
                            if vi['season_id'] == se['id']:
                                season_videos.append(vi['video_id'])
                        # Agregar videos a la season
                        season_dict['videos'] = season_videos
                        playlist_seasons.append(season_dict)

                # Agregar seasons a la playlist
                playlist_dict['seasons'] = playlist_seasons
                segment_playlists.append(playlist_dict)

            # Asignar playlists o livetvlist según el tipo de segment
            if segment['livetv'] == 1:
                segment['livetvlist'] = livetv_channels
                segment['playlist'] = []
            else:
                segment['playlist'] = segment_playlists
                segment['livetvlist'] = []

        return {
            "homecarousel": homecarousel,
            "segments": segments
        }
    except Exception as e:
        logger.error(f"Error obteniendo datos completos de playlist: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        conn.close()

# Agregar endpoint de búsqueda mejorado
@app.get("/playlists/search", response_model=List[PlaylistComplete], tags=["playlists"])
def search_playlists(
    q: str = Query(..., min_length=1, description="Término de búsqueda"),
    category: Optional[str] = None,
    subscription: Optional[int] = None,
    limit: int = Query(10, le=100),
    offset: int = Query(0, ge=0),
    user_claims: dict = Depends(require_auth)
):
    """Buscar playlists por título, descripción o categoría"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Construir query de búsqueda
        base_query = """
        SELECT p.*, s.name as segment_name
        FROM lacajita_playlists p
        LEFT JOIN lacajita_segments s ON p.segment_id = s.id
        WHERE p.active = 1 AND (p.title LIKE %s OR p.description LIKE %s OR p.category LIKE %s)
        """
        params = [f"%{q}%", f"%{q}%", f"%{q}%"]

        # Agregar filtros adicionales
        if category:
            base_query += " AND p.category = %s"
            params.append(category)
        if subscription is not None:
            base_query += " AND p.subscription = %s"
            params.append(subscription)

        # Agregar paginación
        base_query += " ORDER BY p.updated_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(base_query, params)
        results = cursor.fetchall()

        # Formatear fechas
        for playlist in results:
            playlist['created_at'] = format_date('created_at', playlist)
            playlist['updated_at'] = format_date('updated_at', playlist)

        return results
    except Exception as e:
        logger.error(f"Error en búsqueda de playlists: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        conn.close()

# Endpoint mejorado para obtener playlists por segment con detalles completos
@app.get("/playlists/by-segment/{segment_id}", response_model=List[PlaylistComplete], tags=["playlists"])
def get_playlists_by_segment_with_details(
    segment_id: int,
    include_seasons: bool = Query(True, description="Incluir información de seasons"),
    include_videos: bool = Query(False, description="Incluir lista de video IDs"),
    user_claims: dict = Depends(require_auth)
):
    """Obtener todas las playlists de un segment específico con detalles opcionales"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Verificar que el segment existe
        cursor.execute("SELECT id, name, active FROM lacajita_segments WHERE id = %s", (segment_id,))
        segment = cursor.fetchone()
        if not segment:
            raise HTTPException(status_code=404, detail="Segment no encontrado")

        # Obtener playlists del segment
        cursor.execute("""
        SELECT id, segment_id, title, description, category, subscription, subscription_cost, active, created_at, updated_at
        FROM lacajita_playlists
        WHERE segment_id = %s AND active = 1
        ORDER BY updated_at DESC
        """, (segment_id,))
        playlists = cursor.fetchall()

        # Procesar cada playlist
        for playlist in playlists:
            playlist['created_at'] = format_date('created_at', playlist)
            playlist['updated_at'] = format_date('updated_at', playlist)
            playlist['seasons'] = []
            if include_seasons:
                # Obtener seasons para esta playlist
                cursor.execute("""
                SELECT id, playlist_id, title, description, date, active
                FROM lacajita_season
                WHERE playlist_id = %s AND active = 1
                ORDER BY date DESC
                """, (playlist['id'],))
                seasons = cursor.fetchall()
                for season in seasons:
                    season['date'] = format_date('date', season)
                    # Obtener videos de esta season
                    season_videos = []
                    for vi in videos:
                        if vi['season_id'] == se['id']:
                            season_videos.append(vi['video_id'])
                    # Agregar videos a la season
                    season_dict['videos'] = season_videos
                    playlist_seasons.append(season_dict)

            # Agregar seasons a la playlist
            playlist_dict['seasons'] = playlist_seasons

        return CompletePlaylistResponse(
            homecarousel=processed_homecarousel,
            segments=processed_segments
        )
    except Exception as e:
        logger.error(f"Error obteniendo playlists por segment: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        conn.close()

# Endpoint para estadísticas del sistema
@app.get("/stats/overview", tags=["statistics"])
def get_system_overview(user_claims: dict = Depends(require_auth)):
    """Obtener estadísticas generales del sistema"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        stats = {}

        # Contar elementos activos
        cursor.execute("SELECT COUNT(*) as count FROM lacajita_home_carousel WHERE active = 1")
        stats['active_carousel_items'] = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM lacajita_segments WHERE active = 1")
        stats['active_segments'] = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM lacajita_playlists WHERE active = 1")
        stats['active_playlists'] = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM lacajita_season WHERE active = 1")
        stats['active_seasons'] = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM lacajita_videos WHERE active = 1")
        stats['active_videos'] = cursor.fetchone()['count']

        # Estadísticas por categoría
        cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM lacajita_playlists
        WHERE active = 1 AND category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
        """)
        stats['playlists_by_category'] = cursor.fetchall()

        # Playlists con suscripción
        cursor.execute("""
        SELECT SUM(CASE WHEN subscription = 1 THEN 1 ELSE 0 END) as subscription_required,
               SUM(CASE WHEN subscription = 0 THEN 1 ELSE 0 END) as free_content
        FROM lacajita_playlists
        WHERE active = 1
        """)
        subscription_stats = cursor.fetchone()
        stats.update(subscription_stats)

        return stats
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        conn.close()

# Endpoint de health check para playlist
@app.get("/playlist/health", tags=["health"])
def check_playlist_health():
    """Verificar el estado de salud del sistema de playlists"""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Test de conexión básica
        cursor.execute("SELECT 1")
        cursor.fetchone()

        # Verificar tablas principales
        tables_to_check = [
            'lacajita_home_carousel',
            'lacajita_segments',
            'lacajita_playlists',
            'lacajita_season',
            'lacajita_videos'
        ]
        table_status = {}
        for table in tables_to_check:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                table_status[table] = {"status": "ok", "count": count}
            except Exception as e:
                table_status[table] = {"status": "error", "error": str(e)}

        cursor.close()
        conn.close()

        return {
            "status": "healthy",
            "database": "connected",
            "tables": table_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# ——— Endpoints Proxy para API Externa ———————————————————————
# Cache para token de API externa
_external_api_token: Optional[str] = None
_token_expires_at: Optional[datetime] = None

def get_external_api_token() -> str:
    """Obtener token de la API externa usando Client Credentials"""
    global _external_api_token, _token_expires_at

    # Verificar si el token sigue siendo válido (con margen de 5 minutos)
    if (_external_api_token and _token_expires_at and datetime.utcnow() < _token_expires_at):
        return _external_api_token

    try:
        # Solicitar nuevo token
        url = f"{API_BASE_URL}/auth/client-credentials"
        data = {"client_secret": SECRET_KEY}
        response = requests.post(url, json=data, timeout=10)
        response.raise_for_status()
        token_data = response.json()
        _external_api_token = token_data.get("access_token")

        # Calcular tiempo de expiración (con margen de seguridad de 5 minutos)
        expires_in = token_data.get("expires_in", 86400)  # Default 24 horas
        _token_expires_at = datetime.utcnow() + datetime.timedelta(seconds=expires_in - 300)

        return _external_api_token
    except Exception as e:
        logger.error(f"Error obteniendo token de API externa: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error de autenticación con API externa: {str(e)}",
        )

@app.post("/api/external/auth", tags=["external-api"])
def proxy_auth_external():
    """Proxy para autenticación con la API externa"""
    try:
        token = get_external_api_token()
        return {
            "success": True,
            "message": "Autenticación exitosa",
            "token_available": bool(token)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en proxy de autenticación: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en autenticación: {str(e)}",
        )

@app.get("/api/external/health", tags=["external-api"])
def proxy_health_external():
    """Proxy para health check de la API externa"""
    try:
        # Hacer la solicitud a la API externa
        url = f"{API_BASE_URL}/health"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return {
            "external_api": response.json(),
            "proxy_status": "healthy",
            "timestamp": datetime.utcnow().isoformat()
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Error en health check de API externa: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"API externa no disponible: {str(e)}",
        )

@app.get("/api/external/home-carousel", tags=["external-api"])
def proxy_home_carousel_external(user_claims: dict = Depends(require_auth)):
    """Proxy para obtener home carousel de la API externa"""
    try:
        token = get_external_api_token()
        url = f"{API_BASE_URL}/home-carousel"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error obteniendo home carousel de API externa: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error obteniendo datos de API externa: {str(e)}",
        )

@app.get("/api/external/segments", tags=["external-api"])
def proxy_segments_external(user_claims: dict = Depends(require_auth)):
    """Proxy para obtener segments de la API externa"""
    try:
        token = get_external_api_token()
        url = f"{API_BASE_URL}/segments"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error obteniendo segments de API externa: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error obteniendo datos de API externa: {str(e)}",
        )

@app.get("/api/external/playlists", tags=["external-api"])
def proxy_playlists_external(user_claims: dict = Depends(require_auth)):
    """Proxy para obtener playlists completas de la API externa"""
    try:
        token = get_external_api_token()
        url = f"{API_BASE_URL}/playlists"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=30)  # Más tiempo para datos completos
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error obteniendo playlists de API externa: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error obteniendo datos de API externa: {str(e)}",
        )

@app.get("/api/external/test-all", tags=["external-api"])
def test_all_external_endpoints():
    """Endpoint para probar todos los endpoints de la API externa"""
    try:
        token = get_external_api_token()
        results = {
            "authentication": {"status": "success", "token_available": bool(token)},
            "endpoints": {}
        }

        # Probar diferentes endpoints
        endpoints_to_test = [
            {"name": "health", "url": "/health", "auth": False},
            {"name": "home-carousel", "url": "/home-carousel", "auth": True},
            {"name": "segments", "url": "/segments", "auth": True},
            {"name": "playlists", "url": "/playlists", "auth": True}
        ]
        for endpoint in endpoints_to_test:
            try:
                url = f"{API_BASE_URL}{endpoint['url']}"
                headers = {} if endpoint['auth'] else {"Authorization": f"Bearer {token}"}
                response = requests.get(url, headers=headers, timeout=10)
                results["endpoints"][endpoint["name"]] = {
                    "status": "success" if response.status_code == 200 else "error",
                    "status_code": response.status_code,
                    "response_size": len(response.content) if response.content else 0
                }
                if response.status_code != 200:
                    results["endpoints"][endpoint["name"]]["error"] = response.text[:200]
            except Exception as e:
                results["endpoints"][endpoint["name"]] = {
                    "status": "error",
                    "error": str(e)[:200]
                }

        return results
    except Exception as e:
        logger.error(f"Error en test completo de API externa: {e}")
        return {
            "authentication": {"status": "error", "error": str(e)},
            "endpoints": {}
        }

@app.get("/playlists/by-segment/{segment_id}", response_model=List[PlaylistComplete], tags=["playlists"])
def get_playlists_by_segment_with_details(
    segment_id: int,
    active: Optional[int] = 1,
    user_claims: dict = Depends(require_auth)
):
    """ Obtener playlists de un segmento específico con todos sus detalles (seasons y videos).
    - **segment_id**: ID del segmento
    - **active**: Filtrar por estado activo (default: 1)
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Obtener playlists del segmento
        query = """
        SELECT id, segment_id, title, description, category, subscription, subscription_cost, active, created_at, updated_at
        FROM lacajita_playlists
        WHERE segment_id = %s
        """
        params = [segment_id]
        if active is not None:
            query += " AND active = %s"
            params.append(active)
        query += " ORDER BY updated_at DESC"
        cursor.execute(query, params)
        playlists = cursor.fetchall()

        if not playlists:
            return []

        # Obtener todas las seasons de estas playlists
        playlist_ids = [pl['id'] for pl in playlists]
        placeholders = ','.join(['%s'] * len(playlist_ids))
        cursor.execute(f"""
        SELECT id, playlist_id, title, description, date, active
        FROM lacajita_season
        WHERE playlist_id IN ({placeholders}) AND active = 1
        ORDER BY date DESC
        """, playlist_ids)
        seasons = cursor.fetchall()

        # Obtener todos los videos de estas seasons
        if seasons:
            season_ids = [se['id'] for se in seasons]
            placeholders = ','.join(['%s'] * len(season_ids))
            cursor.execute(f"""
            SELECT season_id, video_id, date, active
            FROM lacajita_videos
            WHERE season_id IN ({placeholders}) AND active = 1
            ORDER BY date DESC
            """, season_ids)
            videos = cursor.fetchall()
        else:
            videos = []

        # Función helper para formatear fechas
        def format_datetime_to_iso(dt):
            if dt is None:
                return None
            if isinstance(dt, datetime):
                return dt.isoformat()
            return str(dt)

        # Procesar datos
        result = []
        for pl in playlists:
            playlist_dict = dict(pl)
            playlist_dict['created_at'] = format_datetime_to_iso(playlist_dict['created_at'])
            playlist_dict['updated_at'] = format_datetime_to_iso(playlist_dict['updated_at'])
            # Obtener seasons de esta playlist
            playlist_seasons = []
            for se in seasons:
                if se['playlist_id'] == pl['id']:
                    season_dict = dict(se)
                    season_dict['date'] = format_datetime_to_iso(season_dict['date'])
                    # Obtener videos de esta season
                    season_videos = []
                    for vi in videos:
                        if vi['season_id'] == se['id']:
                            season_videos.append(vi['video_id'])
                    # Agregar videos a la season
                    season_dict['videos'] = season_videos
                    playlist_seasons.append(season_dict)
            # Agregar seasons a la playlist
            playlist_dict['seasons'] = playlist_seasons
            result.append(playlist_dict)

        return result
    except Exception as e:
        print(f"Error en get_playlists_by_segment_with_details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo playlists del segmento: {str(e)}"
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.get("/segments/{segment_id}/summary", tags=["segments"])
def get_segment_summary(
    segment_id: int,
    user_claims: dict = Depends(require_auth)
):
    """ Obtener resumen estadístico de un segmento específico.
    Incluye contadores de playlists, seasons y videos.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Información del segmento
        cursor.execute("""
        SELECT id, name, livetv, order_ as order, active
        FROM lacajita_segments
        WHERE id = %s
        """, (segment_id,))
        segment = cursor.fetchone()
        if not segment:
            raise HTTPException(status_code=404, detail="Segment not found")

        if segment['livetv'] == 1:
            # Para segmentos de LiveTV, obtener canales
            try:
                response = requests.get(LIVETV_API_URL, timeout=5)
                channel_count = len(response.json()) if response.status_code == 200 else 0
            except:
                channel_count = 0
            return {
                "segment": segment,
                "type": "livetv",
                "channel_count": channel_count,
                "playlist_count": 0,
                "season_count": 0,
                "video_count": 0
            }
        else:
            # Para segmentos normales, obtener estadísticas
            cursor.execute("""
            SELECT COUNT(*) as count
            FROM lacajita_playlists
            WHERE segment_id = %s AND active = 1
            """, (segment_id,))
            playlist_count = cursor.fetchone()['count']

            cursor.execute("""
            SELECT COUNT(*) as count
            FROM lacajita_season s
            JOIN lacajita_playlists p ON s.playlist_id = p.id
            WHERE p.segment_id = %s AND s.active = 1 AND p.active = 1
            """, (segment_id,))
            season_count = cursor.fetchone()['count']

            cursor.execute("""
            SELECT COUNT(*) as count
            FROM lacajita_videos v
            JOIN lacajita_season s ON v.season_id = s.id
            JOIN lacajita_playlists p ON s.playlist_id = p.id
            WHERE p.segment_id = %s AND v.active = 1 AND s.active = 1 AND p.active = 1
            """, (segment_id,))
            video_count = cursor.fetchone()['count']

            return {
                "segment": segment,
                "type": "playlist",
                "channel_count": 0,
                "playlist_count": playlist_count,
                "season_count": season_count,
                "video_count": video_count
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en get_segment_summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo resumen del segmento: {str(e)}"
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ——— Configuración para production/systemd ———————————————————————
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        workers=1,
        reload=False
    )

@app.get("/stats/overview", tags=["statistics"])
def get_system_overview(
    user_claims: dict = Depends(require_auth)
):
    """ Obtener estadísticas generales del sistema. Útil para dashboards administrativos. """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        stats = {}

        # Home carousel items
        cursor.execute("SELECT COUNT(*) as count FROM lacajita_home_carousel WHERE active = 1")
        stats['active_carousel_items'] = cursor.fetchone()['count']

        # Segments
        cursor.execute("SELECT COUNT(*) as count FROM lacajita_segments WHERE active = 1")
        stats['active_segments'] = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) as count FROM lacajita_segments WHERE active = 1 AND livetv = 1")
        stats['livetv_segments'] = cursor.fetchone()['count']

        # Playlists
        cursor.execute("SELECT COUNT(*) as count FROM lacajita_playlists WHERE active = 1")
        stats['active_playlists'] = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) as count FROM lacajita_playlists WHERE active = 1 AND subscription = 1")
        stats['subscription_playlists'] = cursor.fetchone()['count']

        # Seasons
        cursor.execute("SELECT COUNT(*) as count FROM lacajita_season WHERE active = 1")
        stats['active_seasons'] = cursor.fetchone()['count']

        # Videos
        cursor.execute("SELECT COUNT(*) as count FROM lacajita_videos WHERE active = 1")
        stats['active_videos'] = cursor.fetchone()['count']

        # Recent activity (últimos 7 días)
        cursor.execute("""
        SELECT COUNT(*) as count
        FROM lacajita_playlists
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """)
        stats['new_playlists_week'] = cursor.fetchone()['count']
        cursor.execute("""
        SELECT COUNT(*) as count
        FROM lacajita_season
        WHERE date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """)
        stats['new_seasons_week'] = cursor.fetchone()['count']

        # LiveTV channels count
        try:
            response = requests.get(LIVETV_API_URL, timeout=5)
            stats['livetv_channels'] = len(response.json()) if response.status_code == 200 else 0
        except:
            stats['livetv_channels'] = 0

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "statistics": stats
        }
    except Exception as e:
        print(f"Error en get_system_overview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas del sistema: {str(e)}"
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.get("/playlists/search", response_model=List[Playlist], tags=["playlists"])
def search_playlists(
    q: str,
    active: Optional[int] = 1,
    limit: Optional[int] = 50,
    user_claims: dict = Depends(require_auth)
):
    """ Buscar playlists por título o descripción.
    - **q**: Término de búsqueda
    - **active**: Filtrar por estado activo (default: 1)
    - **limit**: Límite de resultados (default: 50, max: 100)
    """
    if limit > 100:
        limit = 100
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
        SELECT id, segment_id, title, description, category, subscription, subscription_cost, active, created_at, updated_at
        FROM lacajita_playlists
        WHERE (title LIKE %s OR description LIKE %s)
        """
        params = [f"%{q}%", f"%{q}%"]
        if active is not None:
            query += " AND active = %s"
            params.append(active)
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        cursor.execute(query, params)
        results = cursor.fetchall()
        return results
    except Exception as e:
        print(f"Error en search_playlists: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error buscando playlists: {str(e)}"
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Endpoint de health check específico para playlists
@app.get("/playlist/health", tags=["health"])
def check_playlist_health():
    """ Endpoint de health check específico para el sistema de playlists.
    Verifica conectividad a la base de datos y tablas principales.
    """
    health_status = {
        "timestamp": datetime.utcnow().isoformat(),
        "status": "healthy",
        "checks": {}
    }

    # Check database connection
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        health_status["checks"]["database"] = {"status": "healthy", "message": "Connection successful"}
    except Exception as e:
        health_status["checks"]["database"] = {"status": "unhealthy", "message": f"Database error: {str(e)}"}
        health_status["status"] = "degraded"
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    # Check main tables
    tables_to_check = [
        'lacajita_home_carousel',
        'lacajita_segments',
        'lacajita_playlists',
        'lacajita_season',
        'lacajita_videos'
    ]
    table_status = {}
    for table in tables_to_check:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            table_status[table] = {"status": "ok", "count": count}
        except Exception as e:
            table_status[table] = {"status": "error", "error": str(e)}

    health_status["status"] = "degraded"
    health_status["checks"]["tables"] = table_status

    # Return appropriate HTTP status
    if health_status["status"] == "unhealthy":
        return JSONResponse(content=health_status, status_code=503)
    elif health_status["status"] == "degraded":
        return JSONResponse(content=health_status, status_code=200)
    else:
        return health_status

app.mount("/img", StaticFiles(directory="/opt/fastapi-playlists/img"), name="img")
