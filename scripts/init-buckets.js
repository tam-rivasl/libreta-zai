import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function initializeBuckets() {
  try {
    console.log('Initializing storage buckets...')

    const bucketsToCreate = [
      { name: 'photos', isPublic: true },
      { name: 'videos', isPublic: true },
    ]

    for (const bucket of bucketsToCreate) {
      // Check if bucket exists
      const { data: existingBuckets } = await supabase.storage.listBuckets()
      const exists = existingBuckets?.some(b => b.name === bucket.name)

      if (exists) {
        console.log(`✓ Bucket "${bucket.name}" already exists`)
      } else {
        // Create bucket
        const { data, error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.isPublic,
        })

        if (error) {
          console.error(`✗ Error creating bucket "${bucket.name}":`, error.message)
        } else {
          console.log(`✓ Bucket "${bucket.name}" created successfully`)
        }
      }
    }

    console.log('✓ Storage bucket initialization complete!')
  } catch (error) {
    console.error('Error during initialization:', error)
    process.exit(1)
  }
}

initializeBuckets()
