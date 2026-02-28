import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string

    if (!file || !bucket) {
      return NextResponse.json(
        { error: 'Archivo y bucket son requeridos' },
        { status: 400 }
      )
    }

    // Validate bucket name
    if (!['photos', 'videos'].includes(bucket)) {
      return NextResponse.json(
        { error: 'Bucket no válido' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${user.id}/${timestamp}-${file.name.replace(/[^a-z0-9.-]/gi, '_').toLowerCase()}`

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer()
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      const storageError = error as { status?: number; statusCode?: string }
      const isPolicyError = storageError.status === 403 || storageError.statusCode === '403'
      return NextResponse.json(
        {
          error: isPolicyError
            ? 'Permisos insuficientes para subir archivos. Revisa las políticas RLS de Storage para photos/videos.'
            : error.message,
        },
        { status: isPolicyError ? 403 : 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename)

    return NextResponse.json({
      url: publicUrl,
      filename: data.path,
    })
  } catch (error) {
    console.error('Upload endpoint error:', error)
    return NextResponse.json(
      { error: 'Error al subir el archivo' },
      { status: 500 }
    )
  }
}
