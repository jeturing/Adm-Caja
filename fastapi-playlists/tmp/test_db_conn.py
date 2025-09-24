#!/usr/bin/env python3
import socket, os, sys, traceback

def parse_env(path):
    d={}
    try:
        with open(path) as f:
            for line in f:
                line=line.strip()
                if not line or line.startswith('#') or '=' not in line: continue
                k,v=line.split('=',1)
                d[k.strip()]=v.strip().strip('"').strip("'")
    except Exception as e:
        print(f"Error leyendo {path}: {e}")
        sys.exit(2)
    return d

env=parse_env('/opt/fastapi-playlists/.env')
host=env.get('DB_HOST','localhost')
user=env.get('DB_USER','root')
pw=env.get('DB_PASSWORD','')
db=env.get('DB_NAME','')
print(f"Usando DB_HOST={host} DB_USER={user} DB_NAME={db} (password oculto)")

# Socket test
s=socket.socket()
s.settimeout(5)
try:
    s.connect((host,3306))
    print("PORT 3306 reachable")
    s.close()
except Exception as e:
    print("PORT 3306 NOT reachable:",e)

# try mysql connector
try:
    import mysql.connector
    print("mysql.connector disponible, intentando autenticación...")
    try:
        conn=mysql.connector.connect(host=host,user=user,password=pw,database=db,connect_timeout=5)
        print("Conexión a MySQL exitosa. is_connected=", getattr(conn, 'is_connected', lambda: True)())
        try:
            conn.close()
        except:
            pass
    except Exception as e:
        print("mysql.connector no pudo conectar:", e)
except Exception as e:
    print("mysql.connector no está instalado:", e)
