#!/bin/bash

# Script para instalar todas las dependencias del proyecto Jeturing_CORE

# Instalar dependencias de Node.js
if [ -f "package.json" ]; then
  echo "Instalando dependencias de Node.js..."
  npm install
else
  echo "No se encontró package.json. Saltando instalación de dependencias de Node.js."
fi

# Instalar dependencias de Python
if [ -f "requirements.txt" ]; then
  echo "Instalando dependencias de Python..."
  pip install -r requirements.txt
else
  echo "No se encontró requirements.txt. Saltando instalación de dependencias de Python."
fi

# Mensaje final
echo "✅ Todas las dependencias han sido instaladas."
