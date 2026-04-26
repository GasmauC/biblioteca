# Lector de Documentos Pro

Una aplicación web moderna y minimalista para gestionar y leer documentos PDF y de texto con un enfoque en la privacidad y el rendimiento móvil.

## 🚀 Características

- **Lectura Fluida**: Lector de PDF optimizado con soporte para "Liquid Mode" (reflow de texto) en dispositivos móviles.
- **Privacidad Primero**: Los documentos se almacenan localmente en el navegador usando IndexedDB. Tus datos nunca salen de tu dispositivo.
- **Modo Oscuro**: Interfaz premium diseñada para reducir la fatiga visual.
- **Marcadores y Progreso**: Guarda automáticamente tu última página leída y permite marcar tus documentos favoritos.
- **Rendimiento Mobile**: Optimizado con aceleración por GPU y gestión inteligente de memoria.

## 🛠️ Tecnologías

- **Frontend**: React 19 + TypeScript
- **Estilo**: CSS Vanilla (Diseño Premium Moderno)
- **Estado**: Zustand (Granular & Estable)
- **Almacenamiento**: IndexedDB (via `idb` library)
- **PDF Engine**: PDF.js
- **Animaciones**: Framer Motion

## 📦 Instalación

Sigue estos pasos para ejecutar el proyecto localmente:

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/GasmauC/biblioteca.git
   cd biblioteca
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   ```

## 🚀 Despliegue en Cloudflare

Este proyecto está configurado para desplegarse de forma sencilla en **Cloudflare Pages** o **Cloudflare Workers**.

### Configuración del Build
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Soporte SPA
La aplicación incluye un archivo `public/_redirects` que configura automáticamente el fallback de rutas para que el enrutamiento de React funcione correctamente en producción.

## 📄 Licencia

Este proyecto es de uso personal y educativo. Creado por [Gastón Mauricio Cane](https://github.com/GasmauC).
