-- ═══════════════════════════════════════════════════════════════
-- Step 6: Storage Bucket + Policies
--
-- The "sessions" bucket stores:
--   - Frame JPEGs (frames/0.jpg, frames/1.jpg, ...)
--   - Vitals JSON  (vitals/0.json, vitals/1.json, ...)
--   - Session manifests (manifest.json)
--
-- NOTE: You can also create the bucket via the Supabase
--       dashboard: Storage → New Bucket → "sessions" (public)
-- ═══════════════════════════════════════════════════════════════


-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('sessions', 'sessions', true)
ON CONFLICT (id) DO NOTHING;


-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload to sessions"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sessions');

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read sessions"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sessions');

-- Allow public read access (for demo/verification)
CREATE POLICY "Public can read sessions"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'sessions');
