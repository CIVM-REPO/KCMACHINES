# KC Machines - Estado actual y traspaso

Ultima actualizacion documentada: 2026-06-01.

Este documento resume lo hecho para que un siguiente chat pueda arrancar fresco sin depender de toda la conversacion anterior.

## Estado del repo

- Rama: `main`
- Remoto: `origin/main`
- Ultimo commit conocido: `db7f244 Improve Convex sync fallback`
- Commits recientes relevantes:
  - `db7f244 Improve Convex sync fallback`
  - `14cb8d0 Add Convex state sync`
  - `1780e7e Improve mobile responsiveness`
  - `1e40a2a update script and styles`
  - `72a6425 Fix visual slot merging`

## Arquitectura actual

La app sigue siendo una SPA estatica:

- `index.html`
- `script.js`
- `styles.css`
- `assets/products/*.png`

Ahora usa Convex como estado central remoto, pero mantiene `localStorage` como cache local.

Archivos de Convex/configuracion:

- `convex-config.js`: define `window.KC_CONVEX_URL`.
- `convex/schema.js`: tabla `appState` con indice `by_key`.
- `convex/appState.js`: funciones publicas:
  - `appState:get`
  - `appState:save`
- `convex/_generated/*`: generado por Convex.
- `.env.local`: creado por Convex, ignorado por Git.
- `.gitignore`: ignora `node_modules/` y `.env.local`.

Deployment Convex conectado:

- Deployment: `dev:trustworthy-dinosaur-668`
- Convex URL: `https://trustworthy-dinosaur-668.convex.cloud`
- Dashboard: `https://dashboard.convex.dev/d/trustworthy-dinosaur-668`

Clave principal de estado:

- `kc-machines-v28-product-total`

## Railway

Railway esta conectado al repo.

Al agregar `package.json`, Railpack detecto el proyecto como Node app. Para que siga sirviendo como sitio estatico, Railway necesita la variable:

```txt
RAILPACK_SPA_OUTPUT_DIR=.
```

Esto fuerza el proveedor static/Caddy para servir la SPA desde la raiz.

Si Railway vuelve a fallar el build, revisar:

- Que la variable `RAILPACK_SPA_OUTPUT_DIR` exista en el servicio correcto.
- Que el deploy use el ultimo commit de `main`.
- Logs de Railway: deberia servir estatico, no pedir `npm start`.

## Logica contable actual

Decision principal: la maquina visual es solo visual. La contabilidad corre por producto total, sin depender del orden visual de espacios.

Conceptos:

- Las etiquetas/espacios (`A01`, `A02`, etc.) sirven para agrupar y orientar visualmente.
- Si un producto esta repetido, solo un espacio principal captura/edita; los demas son orientacion grafica.
- Las ventas se calculan por producto contra el stock anterior de ese producto.
- `nextStock` guarda el stock final por producto para pasar a la siguiente visita.
- `salesMovements` guarda movimientos de venta por producto.
- Cada visita guarda `catalogSnapshot`, con precios/costos de referencia en ese momento.
- Los precios/costos del stock anterior se conservan para que un cambio de precio no contamine ventas pendientes de stock viejo.
- Si un producto tenia stock anterior y ya no aparece en la maquina visual actual, no se debe permitir quitarlo/cambiarlo sin capturar datos.

Reglas de catalogo:

- Cambiar/agregar/eliminar productos del catalogo se programa para el siguiente mes.
- Esto evita cambiar columnas/productos dentro del mes ya iniciado.
- Visitas guardadas conservan su `catalogSnapshot`; no deben reescribirse con precios nuevos.
- No debe agregarse a una visita guardada un producto que no existia cuando esa visita se guardo.

Cierres:

- Cierre mensual guarda resumen y `openingStockNextMonth`.
- Cierre anual se genera al cerrar diciembre y puede compactar datos del anio.
- Mes cerrado queda bloqueado para edicion.

## Sincronizacion Convex

La app carga primero de `localStorage` y luego intenta sincronizar con Convex.

Flujo actual:

1. `loadState()` lee cache local.
2. Se pinta la app con estado local.
3. `loadStateFromConvex()` consulta `appState:get`.
4. Si Convex tiene estado mas nuevo, se aplica remoto.
5. Si local tiene datos y Convex esta vacio o mas viejo, se sube local.
6. `saveState()` actualiza `updatedAt`, guarda local y encola `queueConvexSave()`.

Notas importantes:

- Convex usa un solo documento grande para todo el estado.
- Esto es simple y funciona para esta etapa.
- Riesgo: si dos dispositivos editan a la vez, gana el ultimo guardado.
- Para multiusuario real, conviene separar en tablas: productos, visitas, cierres mensuales, cierres anuales.

## Estado real verificado en Convex

Ultima verificacion hecha:

- Convex respondio `status: success`.
- Productos: `31`
- Visitas: `1`
- Fecha de visita guardada: `2026-05-31`
- Cierres mensuales: `0`
- Cierres anuales: `0`
- Issues de consistencia encontrados: `0`

Validaciones hechas sobre datos reales:

- Sin productos duplicados.
- Sin visitas duplicadas por fecha.
- Sin `nextStock` duplicado por producto.
- Sin stock negativo.
- Sin movimientos de venta sin producto.
- Sin movimientos sin precio/costo.
- Visita con `catalogSnapshot`.

## Responsividad y UI

Se ajusto:

- Pantalla principal responsive en telefono.
- Informes responsive.
- Productos responsive.
- Dialogos/cuadros de captura responsive.
- Inputs del dialogo con altura tactil adecuada.
- Botones del dialogo en una columna en telefono.
- Calendario en iPhone: el `input type="date"` real queda encima del boton visual para que Safari abra el picker nativo.
- Cache-busting en scripts:
  - `convex-config.js?v=20260601-convex-sync`
  - `script.js?v=20260601-convex-sync`

## Riesgos o pendientes detectados

1. Boton `Limpiar datos`

Ahora que `saveState()` sincroniza con Convex, `Limpiar datos` puede limpiar la base central, no solo el navegador local.

Recomendacion:

- Proteger con doble confirmacion.
- O convertirlo en herramienta de administracion oculta.
- O separar "limpiar cache local" de "borrar datos centrales".

2. Ultimo guardado gana

Todo el estado vive en un solo documento Convex. Si PC y telefono editan distinto al mismo tiempo, el ultimo save puede pisar al anterior.

Recomendacion futura:

- Separar estado en tablas.
- Guardar visitas por fecha/maquina.
- Guardar catalogo con version mensual.
- Guardar cierres como documentos independientes.

3. Imagenes faltantes

En `assets/products`, faltan imagenes para:

- `ADRENALINE.png`
- `MOUNTAIN DEW.png`
- `MINI CHOKI.png`
- `PRINCIPE.png`
- `CHIKI.png`
- `SUSPIROS.png`

Imagen extra no usada por catalogo actual:

- `TE ARIZONA.png`

4. Pruebas UI automatizadas

El navegador embebido perdio la ruta de automatizacion durante el ultimo barrido, asi que no se pudieron completar clicks automatizados completos.

Si el siguiente chat necesita pruebas UI profundas:

- Reabrir/recuperar Browser plugin.
- Probar flujo: cargar app, guardar visita, recargar, abrir en otra sesion, validar sincronizacion.
- Probar productos, informes, cierres, dialogos moviles.

## Comandos utiles

Git en esta maquina:

```powershell
& 'C:\Program Files\Git\cmd\git.exe' status --short --branch
& 'C:\Program Files\Git\cmd\git.exe' log --oneline --decorate -8
```

Servidor local:

```powershell
npm run dev
```

Si `node.exe` falla con "Acceso denegado" desde PowerShell, usar el runtime interno o revisar permisos. Esto ya ocurrio antes.

Convex:

```powershell
npm run convex:dev
npm run convex:deploy
```

Consulta manual a Convex:

```powershell
Invoke-RestMethod -Method Post `
  -Uri 'https://trustworthy-dinosaur-668.convex.cloud/api/query' `
  -ContentType 'application/json' `
  -Body '{"path":"appState:get","args":{"key":"kc-machines-v28-product-total"},"format":"json"}'
```

## Recomendacion para el siguiente chat

Antes de hacer cambios:

1. Leer este archivo.
2. Revisar `git status --short --branch`.
3. Confirmar si Railway esta desplegado correctamente.
4. Confirmar si Convex tiene datos actuales.
5. Si se va a probar borrado o guardados destructivos, usar una clave de prueba o entorno aislado, no la clave principal.

