# Adm-Caja

Aplicación móvil construida con [Expo Router](https://docs.expo.dev/router/introduction/) que sirve como punto de partida para un flujo con pestañas, componentes tematizados y animaciones suaves. El objetivo de este documento es describir la estructura del proyecto, la funcionalidad existente y los pasos necesarios para ejecutarlo o ampliarlo.

## Tabla de contenido
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Características destacadas](#características-destacadas)
- [Requisitos previos](#requisitos-previos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Scripts disponibles](#scripts-disponibles)
- [Pruebas y calidad](#pruebas-y-calidad)
- [Gestión de fuentes y recursos](#gestión-de-fuentes-y-recursos)
- [Siguientes pasos sugeridos](#siguientes-pasos-sugeridos)

## Stack tecnológico
- **React Native 0.76** y **React 18** como base del desarrollo móvil.
- **Expo 52** para la capa de herramientas, CLI y empaquetado multiplataforma.
- **Expo Router** para navegación declarativa basada en el sistema de archivos.
- **React Native Reanimated** para animaciones de alto rendimiento (parallax y gestos hápticos).
- **TypeScript** para tipado estático y mejor experiencia de desarrollo.

## Estructura del proyecto
```
app/
  _layout.tsx          # Stack principal que carga pestañas y estados globales
  (tabs)/              # Navegación por pestañas (home y explore)
components/
  ui/                  # Utilidades de UI (iconos SF Symbols, fondo con blur)
  *.tsx                # Componentes reutilizables (texto, vistas, animaciones)
constants/Colors.ts    # Paleta clara/oscura compartida
hooks/useColorScheme.ts# Hook para leer el esquema de color del sistema
assets/                # Fuentes e imágenes utilizadas en la UI
scripts/reset-project.js# Script para reiniciar la plantilla base de Expo
```
Cada archivo dentro de `app` define una pantalla o layout de navegación gracias al file-based routing de Expo. Los componentes en `components/` encapsulan comportamientos comunes como texto tematizado, vistas con padding y el scroll con efecto parallax.

## Características destacadas
- **Navegación por pestañas**: `_layout.tsx` dentro de `app/(tabs)` configura dos pestañas (Home y Explore) con iconografía SF Symbols y soporte para haptics personalizados en iOS.
- **Pantalla de bienvenida (Home)**: muestra un encabezado con imagen y efecto parallax, junto a pasos iniciales y tips de desarrollo.
- **Pantalla Explore**: agrupa documentación interactiva en secciones colapsables que explican buenas prácticas de Expo y enlaces externos.
- **Efecto Parallax reutilizable**: `components/ParallaxScrollView.tsx` implementa desplazamiento animado sobre el encabezado y ajusta el padding inferior según la altura de la tab bar.
- **Componentes tematizados**: `ThemedText` y `ThemedView` aplican estilos automáticos en modo claro/oscuro con la paleta declarada en `constants/Colors.ts`.
- **Accesos directos y animaciones**: `HapticTab` envuelve los botones de pestañas para disparar feedback háptico, mientras que `HelloWave` aporta animaciones amistosas usando Reanimated.

## Requisitos previos
1. Node.js 18 o superior y npm 9+.
2. Cuenta gratuita de Expo y la aplicación Expo Go instalada si se desea probar en dispositivos físicos.
3. Android Studio (emulador) o Xcode (simulador) opcionales según la plataforma objetivo.

## Instalación y ejecución
1. Instala dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo con el cliente interactivo de Expo:
   ```bash
   npm start
   ```
   Desde la consola puedes presionar:
   - `a` para abrir el emulador de Android.
   - `i` para abrir el simulador de iOS (macOS requerido).
   - `w` para lanzar la versión web.

## Scripts disponibles
- `npm start`: inicia Metro Bundler con la interfaz de Expo CLI.
- `npm run android` / `npm run ios` / `npm run web`: abre el proyecto directamente en la plataforma correspondiente.
- `npm test`: ejecuta Jest en modo watch aprovechando la configuración `jest-expo`.
- `npm run lint`: corre el linting provisto por Expo para validar estilo y buenas prácticas.
- `npm run reset-project`: restablece la plantilla moviendo el contenido actual a `app-example/` y dejando un lienzo en blanco dentro de `app/`.

## Pruebas y calidad
El proyecto integra [Jest](https://jestjs.io/) con el preset `jest-expo`, lo que permite crear pruebas unitarias para componentes de React Native. Los tests existentes en `components/__tests__` sirven como referencia para montar componentes tematizados y validar estilos.

## Gestión de fuentes y recursos
- Las fuentes personalizadas se cargan en `app/_layout.tsx` mediante `expo-font`, asegurando que la pantalla de splash permanezca visible hasta que el recurso esté disponible.
- Las imágenes se ubican en `assets/images` y admiten sufijos `@2x`/`@3x` para densidades de pantalla. Ejemplos de uso pueden verse en las pantallas Home y Explore.

## Siguientes pasos sugeridos
- Reemplazar las pantallas de ejemplo por las vistas reales del dominio "Adm-Caja".
- Integrar servicios o APIs reales utilizando hooks personalizados en `hooks/`.
- Añadir pruebas adicionales para la lógica de negocio y los componentes que se creen.
- Configurar workflows de CI/CD que ejecuten `npm test` y `npm run lint` antes de publicar nuevas versiones.
