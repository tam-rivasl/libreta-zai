# Configuración de Storage Buckets

Para que la funcionalidad de upload de fotos y videos funcione correctamente, necesitas crear los storage buckets en Supabase.

## Opción 1: Script automático (recomendado)

Ejecuta el siguiente comando desde la carpeta raíz del proyecto:

```bash
node scripts/init-buckets.js
```

Este script creará automáticamente los buckets `photos` y `videos` si no existen.

## Opción 2: Dashboard de Supabase (manual)

Si prefieres hacerlo manualmente desde el dashboard:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el sidebar izquierdo, selecciona **Storage**
3. Haz clic en **Create new bucket**
4. Crea dos buckets con los siguientes nombres:
   - **photos** (público)
   - **videos** (público)
5. Para cada bucket:
   - Asegúrate de que esté marcado como **Public**
   - Haz clic en **Create bucket**

## Políticas RLS (obligatorio)

Con los buckets creados, ejecuta también las políticas de `storage.objects`:

1. Ve a **SQL Editor** en Supabase
2. Ejecuta el contenido de:
   - `scripts/002_storage_photos_videos_policies.sql`

Sin este paso, los uploads fallarán con error `new row violates row-level security policy`.

## Validación

Después de crear los buckets, deberías poder:
- Subir fotos desde la galería
- Subir videos desde la sección de videos
- Ver los archivos aparecer en el dashboard de Storage

## Problemas comunes

### "Bucket not found" error
Si ves este error al intentar subir un archivo, significa que los buckets no existen.
Ejecuta el script o crea los buckets manualmente siguiendo las instrucciones arriba.

### Permisos de escritura
Los buckets son públicos, pero la escritura está controlada por las reglas de RLS (Row Level Security).
Solo usuarios autenticados pueden subir archivos a la carpeta `{user_id}/`.
