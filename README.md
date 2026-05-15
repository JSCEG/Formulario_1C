# Formulario_1C

Formulario web institucional para participantes de la Primera Convocatoria. El proyecto reemplaza el visor previo y deja un flujo completo de captura con validacion de campos, verificacion de duplicados contra la hoja publicada y un Apps Script para guardar en Google Sheets.

## Archivos principales

- `index.html` - nuevo punto de entrada del formulario.
- `formulario-1c.css` - interfaz institucional basada en paleta SENER/GobMX.
- `formulario-1c.js` - render del formulario, validaciones, control de duplicados y envio.
- `google-apps-script/Code.gs` - backend para publicar como Web App de Apps Script.
- `Estilos Institucionales/` - logos, tipografias y base visual reutilizada.

## Lo que ya hace

- Usa logos institucionales y tipografia local del proyecto.
- Consulta la hoja publica TSV para detectar posibles duplicados antes del envio.
- Lee registros desde Google Sheets para alimentar sugerencias del campo `Nombre del proyecto`.
- Interpreta la hoja por encabezado cuando existe `Nombre del Proyecto` y conserva fallback para registros historicos donde el proyecto quedo en la columna de fecha.
- Permite avances semanales del mismo proyecto y evita duplicar solo cuando coincide proyecto + semana de reporte.
- Presenta el formulario por pasos y valida cada seccion antes de avanzar.
- Valida campos obligatorios, longitud minima y detalle condicionado para tramites detenidos u otros.
- Evita doble envio mientras una solicitud esta en curso.

## Configuracion para guardar en Google Sheets

El enlace publico proporcionado sirve solo para lectura. Para guardar en la hoja necesitas publicar el Apps Script incluido en `google-apps-script/Code.gs`.

El Apps Script guarda la marca temporal real en la primera columna y usa la fecha de reporte para distinguir los avances semanales de cada proyecto.

### Paso 1. Crear el Apps Script vinculado a la hoja destino

1. Abre el spreadsheet de destino en modo edicion.
2. En el menu de Google Sheets entra a `Extensiones > Apps Script`.
3. Copia el contenido de `google-apps-script/Code.gs`.
4. Si la pestaña de destino no es la primera, define su nombre en `SHEET_NAME`.
5. Guarda el proyecto.

### Paso 2. Publicar como Web App

1. En Apps Script elige `Deploy > New deployment`.
2. Tipo: `Web app`.
3. Ejecutar como: `Me`.
4. Quien tiene acceso: `Anyone` o `Anyone with the link`.
5. Copia la URL de despliegue.

### Paso 3. Pegar la URL en el frontend

Edita `formulario-1c.js` y reemplaza esta linea:

```js
const APPS_SCRIPT_URL = '';
```

por la URL del Web App:

```js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec';
```

## Hoja publica usada para verificacion

```text
https://docs.google.com/spreadsheets/d/e/2PACX-1vRPZHXFcFuVRHH2gV5lyTSR3BKyZ3C1KyWVDLs5U_NBnvmqecRKa1-BVXNxCy4UkTQaH1HamMW_c7Q_/pub?gid=1770165044&single=true&output=tsv
```

## Despliegue

Sitio estatico sin build step. Compatible con GitHub Pages, Cloudflare Pages, Netlify o apertura directa del `index.html` en navegador.

## Git

El proyecto ya tenia git inicializado. Para este trabajo se actualizara el remoto `origin` al repositorio objetivo:

```bash
https://github.com/JSCEG/Formulario_1C.git
```
