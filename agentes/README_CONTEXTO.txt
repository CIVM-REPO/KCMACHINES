KC MACHINE SELLS CONTROL - MEMORIA PARA SIGUIENTE CONTEXTO
Actualizado: 2026-06-02

PROPOSITO

Esta carpeta contiene la memoria tecnica vigente del proyecto. Esta escrita para un proximo contexto de Codex, no como manual de usuario final.

Leer en este orden:

1. 01_ESTADO_ACTUAL.txt
   Resumen ejecutivo del estado del repo, deployment, commits, datos y decisiones.

2. 02_ARQUITECTURA_APP.txt
   Modelo conceptual: visual, captura temporal, contabilidad, catalogo y cierres.

3. 03_CONVEX_BASE_DE_DATOS.txt
   Tablas reales de Convex, compatibilidad con appState y sincronizacion.

4. 04_FLUJOS_Y_REGLAS.txt
   Flujo de carga inicial, visita real, validaciones, representantes y fechas bloqueadas.

5. 05_MAPA_DE_CODIGO.txt
   Archivos y funciones importantes para modificar el proyecto sin buscar a ciegas.

6. 06_PRUEBAS_Y_OPERACION.txt
   Pruebas manuales, comandos, reset de Convex y verificaciones recomendadas.

ARCHIVOS INTENCIONALMENTE CONSERVADOS

- agentes/migracion/reset-convex-pruebas.mjs
  Script operativo para limpiar datos de prueba en Convex conservando productos/precios.

ARCHIVOS VIEJOS ELIMINADOS

Se eliminaron documentos antiguos de arquitectura, pruebas, handoff y recomendaciones porque describian el modelo anterior basado en slots/salesMovements o estaban incompletos despues de la migracion a visitDetails y tablas reales de Convex.

