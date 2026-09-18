# Lufer IPTV

MVP de reproductor IPTV construido con React + Vite.

## Funciones actuales

- Carga de listas M3U desde archivo local.
- Carga de listas M3U mediante URL.
- Lectura de `tvg-id`, `tvg-name`, `tvg-logo` y `group-title`.
- Búsqueda de canales.
- Filtro por categorías.
- Favoritos guardados en el navegador.
- Reproducción de HLS/M3U8 mediante HLS.js.
- Interfaz responsive preparada para escritorio, móvil y TV.

## Ejecutar

```bash
npm install
npm run dev
```

## Compilar

```bash
npm run build
```

Este proyecto no incluye listas IPTV de terceros. El usuario debe proporcionar fuentes que tenga derecho a utilizar.

## Próximas etapas

1. EPG/XMLTV.
2. Múltiples listas y perfiles.
3. Supabase.
4. Historial y "seguir viendo".
5. Mejoras específicas para Android TV/TV Box.