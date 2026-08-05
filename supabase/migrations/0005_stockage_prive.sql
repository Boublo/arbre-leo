-- ===========================================================================
-- L'arbre de Leo — 0005 stockage prive
-- ---------------------------------------------------------------------------
-- stockage : bucket prive et ses politiques
-- ===========================================================================

-- Bucket prive : aucune URL publique. Les photos de famille et les actes
-- d etat civil ne sont servis que via une URL signee, a un membre valide.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'arbre-medias',
  'arbre-medias',
  false,
  52428800,
  array[
    'image/jpeg','image/png','image/webp','image/avif','image/heic','image/tiff',
    'application/pdf',
    'audio/mpeg','audio/mp4','audio/ogg','audio/wav',
    'video/mp4','video/webm','video/quicktime'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "arbre medias lecture membre valide"
  on storage.objects for select to authenticated
  using (bucket_id = 'arbre-medias' and arbre.est_membre_valide());

create policy "arbre medias depot contributeur"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'arbre-medias' and arbre.peut_contribuer() and owner = auth.uid());

create policy "arbre medias modification proprietaire"
  on storage.objects for update to authenticated
  using (bucket_id = 'arbre-medias' and (owner = auth.uid() or arbre.est_admin()))
  with check (bucket_id = 'arbre-medias' and (owner = auth.uid() or arbre.est_admin()));

create policy "arbre medias suppression proprietaire"
  on storage.objects for delete to authenticated
  using (bucket_id = 'arbre-medias' and (owner = auth.uid() or arbre.est_admin()));
