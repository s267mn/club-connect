'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FilePlus, Upload, Clock } from 'lucide-react';
import { enforceWordLimit, TEXT_LIMITS } from '@/lib/textLimits';

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
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
      if (file.size > MAX_FILE_SIZE) {
        setError('File is too large. Max size is 5MB.');
        setSubmitting(false);
        return;
      }

      const fileName = `${userId}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('contribution-files').upload(fileName, file);
      if (uploadError) { setError(uploadError.message); setSubmitting(false); return; }
      const { data: urlData } = supabase.storage.from('contribution-files').getPublicUrl(fileName);
      fileUrl = urlData.publicUrl;
    }

    const { error: insertError } = await supabase.from('contributions').insert({
      user_id: userId, club_id: clubId, skill_id: skillId, title, description, file_url: fileUrl, status: 'pending',
    });

    if (insertError) { setError(insertError.message); setSubmitting(false); return; }

    // Notify every current admin of the club — not just the original founder,
    // so admins promoted later still get notified of new submissions.
    const { data: admins } = await supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', clubId)
      .eq('role', 'admin');

    for (const admin of admins ?? []) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: admin.user_id,
        message: `New contribution submitted: "${title}"`,
        activity_type: 'new_contribution',
        club_id: clubId,
        actor_id: userId,
      });
      if (notifError) console.error('Failed to notify club admin:', notifError);
    }

    setSuccess(true);
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="card-tint bg-[var(--peach)] p-6 mb-6 fade-up flex items-center gap-3">
        <Clock className="icon-spin text-[var(--peach-ink)]" size={20} />
        <p className="text-sm text-[var(--peach-ink)]">Contribution submitted. Waiting for admin verification.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 mb-6 max-w-md fade-up">
      <div className="flex items-center gap-2 mb-4">
        <FilePlus className="text-[var(--peach-ink)]" size={18} />
        <h3 className="font-display text-lg">Submit a Contribution</h3>
      </div>

      <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className="w-full p-3 mb-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" required>
        <option value="">Select a skill</option>
        {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <input
        type="text"
        placeholder="Title (e.g. Edited recruitment video)"
        value={title}
        onChange={(e) => setTitle(enforceWordLimit(e.target.value.slice(0, TEXT_LIMITS.contributionTitle)))}
        maxLength={TEXT_LIMITS.contributionTitle}
        className="w-full p-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none"
        required
      />
      <p className="text-xs text-[var(--ink-dim)] text-right mb-3">{title.length}/{TEXT_LIMITS.contributionTitle}</p>

      <textarea
        placeholder="Describe what you did"
        value={description}
        onChange={(e) => setDescription(enforceWordLimit(e.target.value.slice(0, TEXT_LIMITS.contributionDescription)))}
        maxLength={TEXT_LIMITS.contributionDescription}
        className="w-full p-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none"
        rows={3}
      />
      <p className="text-xs text-[var(--ink-dim)] text-right mb-3">{description.length}/{TEXT_LIMITS.contributionDescription}</p>

      <label className="flex items-center gap-2 text-sm text-[var(--ink-dim)] mb-1 cursor-pointer border border-dashed border-[var(--border)] rounded-xl p-3 hover:border-[var(--peach-ink)] transition-colors">
        <Upload size={16} />
        {file ? file.name : 'Attach a photo of your work (recommended)'}
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
      </label>
      <p className="text-xs text-[var(--ink-dim)] mb-4">Max file size: 5MB</p>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-sm disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit Contribution'}</button>
    </form>
  );
}