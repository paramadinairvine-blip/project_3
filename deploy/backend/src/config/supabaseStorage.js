const { createClient } = require('@supabase/supabase-js');

let supabase = null;

const getSupabaseClient = () => {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
};

const isSupabaseStorageEnabled = () => {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
};

/**
 * Upload file buffer ke Supabase Storage
 * @param {string} bucket - Nama bucket (e.g., 'product-images')
 * @param {string} filePath - Path di dalam bucket (e.g., 'products/image-123.jpg')
 * @param {Buffer} fileBuffer - File buffer dari multer memoryStorage
 * @param {string} contentType - MIME type (e.g., 'image/jpeg')
 * @returns {Promise<{url: string}>}
 */
const uploadToSupabase = async (bucket, filePath, fileBuffer, contentType) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase Storage tidak dikonfigurasi');
  }

  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Gagal upload ke Supabase Storage: ${error.message}`);
  }

  // Generate public URL
  const { data: urlData } = client.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return { url: urlData.publicUrl };
};

/**
 * Hapus file dari Supabase Storage
 * @param {string} bucket - Nama bucket
 * @param {string} filePath - Path file di dalam bucket
 */
const deleteFromSupabase = async (bucket, filePath) => {
  const client = getSupabaseClient();
  if (!client) return;

  await client.storage.from(bucket).remove([filePath]);
};

module.exports = {
  getSupabaseClient,
  isSupabaseStorageEnabled,
  uploadToSupabase,
  deleteFromSupabase,
};
