# JWPlayer Ingest - systemd unit + timer (ejemplo)

Este archivo contiene ejemplos de unidad systemd para ejecutar el script de ingestión periódicamente.

Archivos:
- `/etc/systemd/system/jw-ingest.service`
- `/etc/systemd/system/jw-ingest.timer`

Contenido sugerido:

--- jw-ingest.service ---

```
[Unit]
Description=JWPlayer ingest script
After=network.target

[Service]
Type=oneshot
User=www-data
Group=www-data
WorkingDirectory=/opt/fastapi-playlists
Environment=API_URL=https://mi-backend.example.com/api
Environment=API_TOKEN=Bearer\ mytoken
ExecStart=/usr/bin/python3 /opt/fastapi-playlists/scripts/jw_ingest.py --config /opt/fastapi-playlists/scripts/jw_sources.json

[Install]
WantedBy=multi-user.target
```

--- jw-ingest.timer ---

```
[Unit]
Description=Run jw-ingest every 6 hours

[Timer]
OnBootSec=5min
OnUnitActiveSec=6h
Persistent=true

[Install]
WantedBy=timers.target
```

Instalación (ejemplo):

```bash
sudo cp jw-ingest.service /etc/systemd/system/
sudo cp jw-ingest.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jw-ingest.timer
sudo systemctl status jw-ingest.timer
```

Notas:
- Ajusta `User/Group` según la cuenta que ejecute tu aplicación.
- Asegúrate de que `API_TOKEN` y `API_URL` estén en variables de entorno seguras (o en un archivo `.env` accesible solo por el usuario).
- Para entornos donde las páginas requieren ejecución JS para construir el objeto `jwplayer`, se debe usar una variante con Playwright (headless) y mayores recursos.
