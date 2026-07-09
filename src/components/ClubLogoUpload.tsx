'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload } from 'lucide-react';

export default function ClubLogoUpload({ clubId, currentLogoUrl, onUploaded }: { clubId: string; currentLogoUrl: string | null; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_LOGO_SIZE) {
      setError('Logo must be under 2MB.');
      return;
    }

    setUploading(true);

    const fileName = `${clubId}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('club-logos').upload(fileName, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('club-logos').getPublicUrl(fileName);
    const { error: updateError } = await supabase.from('clubs').update({ logo_url: urlData.publicUrl }).eq('id', clubId);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    onUploaded(urlData.publicUrl);
    setUploading(false);
  };

  return (
    <div>
      <label className="inline-flex items-center gap-2 text-xs text-[var(--ink-dim)] cursor-pointer border border-dashed border-[var(--border)] rounded-lg px-3 py-2 hover:border-[var(--peach-ink)] transition-colors">
        <Upload size={13} />
        {uploading ? 'Uploading...' : currentLogoUrl ? 'Change logo' : 'Upload logo'}
        <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
      </label>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      <p className="text-xs text-[var(--ink-dim)] mt-1">Max 2MB</p>
    </div>
  );
}