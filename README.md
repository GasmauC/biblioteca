# Lector de Documentos Pro

Una aplicación moderna y rápida para gestionar y leer documentos PDF, TXT y HTML, optimizada para escritorio y móviles.

## Características Principales

- **Multi-formato**: Soporte para lectura de archivos PDF, TXT y HTML.
- **Liquid Mode**: Permite extraer el texto de documentos PDF para una lectura fluida (reflow) adaptable a pantallas pequeñas.
- **Responsive Design**: Interfaz 100% adaptable a dispositivos móviles.
- **Persistencia Avanzada**: Utiliza IndexedDB para guardar localmente tus documentos, progreso exacto, marcadores y favoritos.
- **Resaltador Integrado**: Herramienta de resaltado para PDFs con guardado automático.
- **Modo Oscuro/Claro**: Adaptado a la preferencia de lectura.

## Autoría

Diseñado y desarrollado por **Gastón Mauricio Cane**.

## Tecnologías Utilizadas

- React 19
- TypeScript
- Vite
- Zustand (Manejo de estado)
- IndexedDB (Almacenamiento persistente local)
- PDF.js (Renderizado y parseo de PDFs)
- Framer Motion (Animaciones)
- Tailwind / CSS Vanilla (Estilos)

## Instrucciones de Instalación

1. Clona este repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Ejecuta el entorno de desarrollo:
   ```bash
   npm run dev
   ```

## Preparación para Producción

Para compilar la aplicación para producción:

```bash
npm run build
```
Los archivos optimizados se generarán en la carpeta `dist`.
