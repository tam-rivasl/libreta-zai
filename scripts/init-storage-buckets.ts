import { createClient } from '@/lib/supabase/server'

/**
 * Script para inicializar buckets de Supabase Storage
 * Crea los buckets 'photos' y 'videos' si no existen
 */
async function initializeStorageBuckets() {
  const supabase = await createClient()

  try {
    // Get the list of existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }

    console.log('Existing buckets:', buckets?.map((b: { name: string }) => b.name) || [])

    // Create photos bucket if it doesn't exist
    if (!buckets?.some((b: { name: string }) => b.name === 'photos')) {
      const { data: photosBucket, error: createPhotosError } = await supabase.storage.createBucket('photos', {
        public: true,
      })

      if (createPhotosError) {
        console.error('Error creating photos bucket:', createPhotosError)
      } else {
        console.log('Created photos bucket:', photosBucket)
      }
    } else {
      console.log('photos bucket already exists')
    }

    // Create videos bucket if it doesn't exist
    if (!buckets?.some((b: { name: string }) => b.name === 'videos')) {
      const { data: videosBucket, error: createVideosError } = await supabase.storage.createBucket('videos', {
        public: true,
      })

      if (createVideosError) {
        console.error('Error creating videos bucket:', createVideosError)
      } else {
        console.log('Created videos bucket:', videosBucket)
      }
    } else {
      console.log('videos bucket already exists')
    }

    console.log('Storage buckets initialized successfully')
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run initialization
initializeStorageBuckets()
