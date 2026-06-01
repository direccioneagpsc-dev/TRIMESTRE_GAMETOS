# BANCO_GAMETOS_TRIMESTRAL_2026

Proyecto independiente para levantar la informacion trimestral de bancos de gametos desde el anio 2026 en adelante.

## Archivos

- `index.html`, `styles.css`, `script.js`: formulario web.
- `Code.gs`: backend para Google Apps Script.

## Configuracion

1. Crea o abre el Google Sheets donde guardaras la data.
2. Crea una hoja llamada `REPORTE_TRIMESTRAL`.
3. Agrega una hoja `INVENTARIO` con las columnas `CORREO AUTORIZADO` y `CONTRASENA` para el login.
4. En Apps Script pega `Code.gs` y reemplaza `PEGAR_ID_DEL_GOOGLE_SHEETS`.
5. Despliega como aplicacion web.
6. Pega la URL del despliegue en `CONFIG.appsScriptUrl` de `script.js`.

Mientras `appsScriptUrl` este vacio, el formulario guarda en `localStorage` y permite exportar CSV.
