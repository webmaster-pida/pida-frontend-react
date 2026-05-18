========================================================================
GUÍA DE DESPLIEGUE - PIDA FRONTEND (APLICACIÓN PRINCIPAL VS ADMIN)
========================================================================

Este archivo sirve como recordatorio rápido para realizar el proceso de 
compilación (build) y despliegue (deploy) de las interfaces de PIDA, 
evitando confusiones entre la aplicación de usuarios y el panel de control.

------------------------------------------------------------------------
1. APLICACIÓN PRINCIPAL (Chat de Investigadores / Usuarios)
------------------------------------------------------------------------
Usa este flujo cuando realices cambios en componentes del chat del usuario, 
la interfaz de cuenta (AccountInterface), pasarela de pagos, etc.

Paso 1: Ubícate en la raíz del proyecto.
   - Abre tu terminal en la carpeta principal 'pida-frontend-react'.
   - ¡IMPORTANTE! Asegúrate de NO estar dentro de la carpeta 'admin-panel'.
   - Si tu terminal está dentro de admin-panel, sal de ella escribiendo:
     cd ..

Paso 2: Compilar la aplicación.
   - Ejecuta el comando de Vite para generar los archivos limpios de producción:
     npm run build

Paso 3: Subir a Firebase Hosting.
   - Despliega únicamente el servicio de hosting para la app principal:
     firebase deploy --only hosting

------------------------------------------------------------------------
2. PANEL DE ADMINISTRACIÓN (Admin Panel)
------------------------------------------------------------------------
Usa este flujo SOLO si modificaste la gestión de biblioteca, ingesta de 
documentos o visualización de estadísticas globales de administración.

Paso 1: Entra a la carpeta del administrador.
   - En tu terminal, muévete al directorio interno escribiendo:
     cd admin-panel

Paso 2: Compilar el panel administrativo.
   - Ejecuta el comando de compilación (estando dentro de admin-panel):
     npm run build

Paso 3: Subir a Firebase Hosting (Admin).
   - Despliega el sitio utilizando su alias o comando específico asignado:
     firebase deploy --only hosting:admin
     (o el comando de despliegue que uses habitualmente para el admin)

------------------------------------------------------------------------
3. TABLA DE REFERENCIA RÁPIDA
------------------------------------------------------------------------

| Característica | Aplicación Principal (Chat)   | Panel de Administración (Admin)  |
| -------------- | ----------------------------- | -------------------------------- |
| Carpeta Raíz   | pida-frontend-react           | pida-frontend-react/admin-panel |
| Comando Build  | npm run build                 | npm run build                    |
| Comando Deploy | firebase deploy --only hosting| firebase deploy --only hosting...|

========================================================================
Guardar este archivo en la raíz del proyecto para futuras consultas.
========================================================================
