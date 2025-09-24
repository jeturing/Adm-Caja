# Diseño (Conciso)
Objetivo: Asegurar que el endpoint legacy `/idhomecarousel` acepte `link` opcional (null o "") y soporte el nuevo campo `muted`. Evitar errores 422 en producción cuando el frontend envíe `link: null` y permitir interoperabilidad con clientes antiguos que envían `link: ""`.

Scope:
- Archivo a modificar: `Core_M_cajita.py` (legacy API handler)
- Cambios mínimos: normalizar `link` en Pydantic, validar presencia de `imgsrc` o `video`, almacenar `muted` como 0/1.
- DB: añadir columna `muted` (si no existe).

Archivos impactados:
- `/opt/fastapi-playlists/Core_M_cajita.py` (handler legacy)
- DB: tabla `lacajita_home_carousel` (nueva columna `muted`)

Patrones existentes a respetar:
- Minimal change: mantener API behavior de delete via `id>0`.
- Usar HTTPException para errores con status codes claros.
- No romper rutas existentes; mantener middleware `strip_api_prefix`.

API/Contrato:
- POST `/api/idhomecarousel` (legacy): request body `Homecarousel`:
  - `id` int: 0 para insertar, >0 para eliminar
  - `link`: nullable string (null o string) — ahora aceptado y normalizado
  - `imgsrc` / `video`: al menos uno requerido para insert
  - `muted`: boolean (opcional)
- Respuestas: `{msg: "Insertado"}` / `{msg: "Eliminado"}` o HTTP 400 con detalle en caso de validación.

Retrocompatibilidad:
- Si cliente envía `link: null` o `link: ""` ambos se normalizan a `None` internamente.
- Si cliente sigue enviando `link: ""` (legacy clients), se aceptará.

Riesgos:
- Migración DB en producción sin backup puede causar pérdida; siempre hacer backup.
- Si hay código cliente que depende de `link` siendo cadena vacía, normalizarlo a `null` puede afectar integraciones externas.

Alternativas:
- Actualizar frontend para reintentar con `link:""` (ya aplicado), o
- Aplicar cambio en backend (preferido) y desplegar.

---

# Parche Aplicado (diff)
```diff
*** Modificado: /opt/fastapi-playlists/Core_M_cajita.py
@@
-class Homecarousel(BaseModel):
-    id:int = 0
-    link: Optional[str] = None
-    imgsrc: Optional[str] = None
-    video: Optional[str] = None
-    muted: Optional[bool] = False
+class Homecarousel(BaseModel):
+    id: int = 0
+    link: Optional[str] = None
+    imgsrc: Optional[str] = None
+    video: Optional[str] = None
+    muted: Optional[bool] = False
+
+    @validator('link', pre=True, always=True)
+    def _normalize_link(cls, v):
+        if v is None:
+            return None
+        if isinstance(v, str):
+            s = v.strip()
+            return s if s != "" else None
+        try:
+            s = str(v).strip()
+            return s if s != "" else None
+        except Exception:
+            return None
@@
-def idHomecarousel(hc: Homecarousel, user: dict = Depends(require_auth)):
-    if hc.id > 0:
-        conn = getConnection(); cur = conn.cursor()
-        cur.execute('delete from lacajita_home_carousel where id=%s', (hc.id,))
-        conn.commit(); cur.close(); conn.close()
-        return {"msg":"Eliminado"}
-    if not (hc.imgsrc or hc.video):
-        return {"error":"Debe introducir el tipo de link!"}
-    conn = getConnection(); cur = conn.cursor()
-    cur.execute('insert into lacajita_home_carousel (link, imgsrc, video, muted) values(%s,%s,%s,%s)',
-                (hc.link, hc.imgsrc, hc.video, int(hc.muted or False)))
-    conn.commit(); cur.close(); conn.close()
-    return {"msg":"Insertado"}
+def idHomecarousel(hc: Homecarousel, user: dict = Depends(require_auth)):
+    if hc.id > 0:
+        conn = getConnection(); cur = conn.cursor()
+        cur.execute('delete from lacajita_home_carousel where id=%s', (hc.id,))
+        conn.commit(); cur.close(); conn.close()
+        return {"msg": "Eliminado"}
+
+    if not (hc.imgsrc or hc.video):
+        raise HTTPException(status_code=400, detail="Debe introducir el tipo de link (imgsrc o video)")
+
+    muted_val = 1 if bool(hc.muted) else 0
+
+    conn = getConnection(); cur = conn.cursor()
+    cur.execute(
+        'insert into lacajita_home_carousel (link, imgsrc, video, muted) values(%s,%s,%s,%s)',
+        (hc.link, hc.imgsrc, hc.video, muted_val)
+    )
+    conn.commit(); cur.close(); conn.close()
+    return {"msg": "Insertado"}
```

# Migración SQL
Ejecutar en la base de datos MySQL (hacer backup antes):

```sql
ALTER TABLE lacajita_home_carousel
  ADD COLUMN IF NOT EXISTS muted TINYINT(1) NOT NULL DEFAULT 0;
```

Nota: algunos MySQL no soportan `IF NOT EXISTS` en `ADD COLUMN`; alternativa segura:

```sql
-- verificar existencia
SELECT column_name FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'lacajita_home_carousel' AND column_name = 'muted';

-- si no existe ejecutar:
ALTER TABLE lacajita_home_carousel ADD COLUMN muted TINYINT(1) NOT NULL DEFAULT 0;
```

# Pasos de despliegue (producción)
1. Hacer backup de la base de datos (mysqldump):

```bash
mysqldump -h $DB_HOST -u $DB_USER -p $DB_NAME > /tmp/db_backup_$(date +%Y%m%d_%H%M).sql
```

2. Conectarse al servidor de aplicación y poner en modo mantenimiento opcional.
3. Aplicar migración SQL (ver arriba) usando cliente MySQL con la cuenta apropiada.
4. Desplegar el nuevo código (reemplazar `Core_M_cajita.py` o hacer `git pull` en el release branch).
5. Reiniciar el servicio (systemd) que ejecuta la app FastAPI/Uvicorn: `sudo systemctl restart lacajita.service` (ajustar nombre de servicio).
6. Verificar logs y endpoint:
   - `curl -I https://<host>/api/homecarousel` debe devolver 200
   - Probar POST insert con `link:null` y con `link:""`.
7. Si hay error, restaurar DB desde dump y revertir código.

# Rollback Plan
- Revertir código en Git y reiniciar servicio.
- Restaurar DB desde dump si la migración creó side effects inesperados.

# Checklist de Seguridad (rápido)
- [ ] Secrets en .env no comprometidos
- [ ] Auth0 audience/issuer verificados
- [ ] DB backup realizado
- [ ] Endpoints probados localmente con pruebas unitarias


