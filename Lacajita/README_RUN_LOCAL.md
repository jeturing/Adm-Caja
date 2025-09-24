# Ejecutar La Cajita localmente (servidor)

Instrucciones rápidas para dejar la aplicación funcionando en un servidor de desarrollo.

Requisitos mínimos
- Linux server
- `ssh`, `python3`, `pip` (venv), `npm` y `node`
- Acceso a las credenciales necesarias (SSH para túnel DB, `.env` con `SECRET_KEY` y variables Auth0)

Resumen de pasos (automatizado)
1. Ejecuta `scripts/setup_local_dev.sh` para preparar venv, instalar deps, levantar API y Vite, y verificar health.
2. Usa `scripts/health_check.sh` para validar el estado cuando quieras.
3. Para detener todo, ejecuta `scripts/stop_local_dev.sh`.

Comandos rápidos (desde `/root/APP/Lacajita`)

- Setup completo (intenta abrir túnel si configuras TUNNEL_USER/TUNNEL_HOST):
```bash
./scripts/setup_local_dev.sh
```

- Health check rápido:
```bash
./scripts/health_check.sh
```

- Prueba de endpoints vía proxy con token:
```bash
./scripts/test_api_via_proxy.sh
```

- Detener backend, frontend y cerrar túnel:
```bash
./scripts/stop_local_dev.sh
```

Notas de seguridad y producción
- `DEV_AUTH_BYPASS=true` debe quedar solo en entornos de desarrollo. Desactívalo en `production`.
- No subas `.env` con secretos a repositorios públicos.
- Gestiona el túnel SSH con un servicio seguro si lo necesitas de forma persistente (systemd, autossh).

Soporte
- Si los endpoints devuelven 500, revisa `uvicorn-8002.log` y asegúrate de que el túnel SSH esté activo y que las credenciales de DB en `.env` sean correctas.
- `setup_local_dev.sh` intentará abrir un túnel en `DB_PORT` si falló la conexión y definiste `TUNNEL_USER/TUNNEL_HOST`. Si ya hay algo escuchando en ese puerto, no abrirá otro túnel.
