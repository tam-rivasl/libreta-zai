# Guía de Instalación de Buckets de Supabase Storage

## Descripción
Este proyecto utiliza Supabase Storage para almacenar fotos en la galería y videos. Se necesitan dos buckets: `photos` y `videos`.

## Pasos para configurar

### 1. Inicializar los buckets automáticamente (Recomendado)

Ejecuta el siguiente comando en tu terminal:

```bash
npx ts-node scripts/init-storage-buckets.ts
```

Esto creará automáticamente los buckets `photos` y `videos` como públicos en tu proyecto Supabase.

### 2. Crear los buckets manualmente

Si prefieres hacerlo manualmente en la consola de Supabase:

1. Ve a **Storage** en tu proyecto Supabase
2. Haz clic en **New bucket**
3. Crea un bucket con el nombre `photos`
   - Activa **Public bucket** para permitir acceso público
4. Repite el proceso para crear el bucket `videos`

## Configuración de permisos

Los buckets están configurados como públicos, lo que significa:
- Las imágenes y videos subidos son visibles públicamente
- Los URLs generados pueden ser compartidos
- Se mantiene la privacidad mediante los flags `is_shared` en la base de datos

### Políticas RLS obligatorias para subir archivos

Además de crear los buckets, debes crear políticas RLS en `storage.objects` para
permitir inserts en `photos` y `videos`.

1. Abre Supabase Dashboard -> **SQL Editor**
2. Ejecuta el SQL del archivo:
   - `scripts/002_storage_photos_videos_policies.sql`
3. Verifica que existan políticas para:
   - `photos_insert_own_folder`
   - `videos_insert_own_folder`

## Funcionalidad de upload

Una vez los buckets estén configurados:

### En la Galería
- Haz clic en "Agregar" para añadir una nueva foto
- Arrastra y suelta el archivo o haz clic para seleccionar
- Escribe un título
- Elige si quieres compartirla o mantenerla privada
- Haz clic en "Guardar"

### En Videos
- Haz clic en "Agregar" para añadir un nuevo video
- Arrastra y suelta el archivo o haz clic para seleccionar
- Escribe un título
- Elige si quieres compartirlo o mantenerlo privado
- Haz clic en "Guardar"

## Limitaciones y consideraciones

- Los archivos se suben a Supabase Storage directamente desde el navegador
- El nombre de archivo se genera automáticamente con timestamp para evitar conflictos
- Se soportan formatos estándar de imagen (JPG, PNG, GIF, WebP, etc.)
- Se soportan formatos estándar de video (MP4, WebM, MOV, etc.)
- Los archivos se organizan por usuario (carpeta con ID del usuario)

## Solución de problemas

Si los uploads no funcionan:

1. Verifica que los buckets existan en Supabase Storage
2. Ejecuta `scripts/002_storage_photos_videos_policies.sql` en Supabase SQL Editor
3. Verifica que tengas las variables de entorno correctas configuradas
4. Comprueba que el API endpoint `/api/upload` esté accesible
5. Revisa la consola del navegador para mensajes de error específicos

## Tema y portada por usuario (BD)

Para que la personalización de tema/colores/portada se guarde por usuario
(y no se comparta con otros), ejecuta además:

1. Abre Supabase Dashboard -> **SQL Editor**
2. Ejecuta:
   - `scripts/003_user_notebook_settings.sql`
   - `scripts/004_user_notebook_cover_images.sql` (si ya tenías la tabla creada)

Esto crea la tabla `user_notebook_settings` con RLS por `auth.uid()`.

## Ejemplos de URLs generadas

Después de subir un archivo, Supabase genera URLs públicas como:

```
https://[tu-proyecto].supabase.co/storage/v1/object/public/photos/[user-id]/[timestamp]-[filename].jpg
```

Estos URLs se almacenan en la base de datos y se pueden compartir directamente.
