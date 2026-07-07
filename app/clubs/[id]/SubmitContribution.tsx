'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Skill = { id: string; name: string };

export default function SubmitContribution({ clubId, userId }: { clubId: string; userId: string }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillId, setSkillId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSkills = async () => {
      const { data } = await supabase.from('skills').select('id, name');
      setSkills(data ?? []);
    };
    loadSkills();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    let fileUrl = '';

    if (file) {
      const fileName = `${userId}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('contribution-files').upload(fileName, file);

      if (uploadError) {
        setError(uploadError.message);
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('contribution-files').getPublicUrl(fileName);
      fileUrl = urlData.publicUrl;
    }

    const { error: insertError } = await supabase.from('contributions').insert({
      user_id: userId,
      club_id: clubId,
      skill_id: skillId,
      title,
      description,
      file_url: fileUrl,
      status: 'pending',
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="panel rounded-lg p-6 mb-10 fade-up flex items-center gap-4">
        <span className="badge-pending">...</span>
        <p className="text-[var(--cyan)]">Contribution submitted. Waiting for admin verification.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="panel rounded-lg p-6 mb-10 max-w-md fade-up">
      <p className="font-mono text-xs tracking-[0.3em] uppercase text-[var(--steel)] mb-2">Log Work</p>
      <h3 className="font-display text-lg text-[var(--cyan)] glow-cyan mb-4">Submit a Contribution</h3>

      <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className="w-full p-3 mb-3 bg-[var(--bg)] border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--cyan)] focus:outline-none transition-colors text-sm" required>
        <option value="">Select a skill</option>
        {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <input type="text" placeholder="Title (e.g. Edited recruitment video)" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--cyan)] focus:outline-none transition-colors text-sm" required />

      <textarea placeholder="Describe what you did" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--cyan)] focus:outline-none transition-colors text-sm" rows={3} />

      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full mb-4 text-sm text-[var(--steel)]" />

      {error && <p className="text-[var(--magenta)] text-sm mb-3">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-3 rounded-md disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit Contribution'}</button>
    </form>
  );
}