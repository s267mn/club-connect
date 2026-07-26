'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { FilePlus, Upload, Clock, Search, Check, ShieldCheck } from 'lucide-react';
import { enforceWordLimit, TEXT_LIMITS } from '@/lib/textLimits';

type Skill = { id: string; name: string };

export default function SubmitContribution({ clubId, userId }: { clubId: string; userId: string }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillId, setSkillId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSkills = async () => {
      const { data, error } = await supabase.from('skills').select('id, name');
      if (error) console.error('Failed to load skills:', error);
      setSkills(data ?? []);
    };
    loadSkills();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSkills = skills
    .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const query = searchQuery.toLowerCase();

      const aStarts = aName.startsWith(query) ? 0 : 1;
      const bStarts = bName.startsWith(query) ? 0 : 1;

      if (aStarts !== bStarts) return aStarts - bStarts;
      return aName.localeCompare(bName);
    });

  const selectedSkillName = skills.find((s) => s.id === skillId)?.name || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!skillId) {
      setError('Please select a valid skill from the dropdown.');
      return;
    }

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
      <div className="card-tint bg-[var(--peach)] p-6 mb-6 fade-up flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3">
          <Clock className="icon-spin text-[var(--peach-ink)] shrink-0" size={20} />
          <p className="text-sm text-[var(--peach-ink)] font-medium">Contribution submitted. Waiting for admin verification.</p>
        </div>
        <div className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white/40 rounded-full text-[var(--peach-ink)] shrink-0">
          <ShieldCheck size={14} /> Pending Review
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 mb-6 w-full fade-up">
      <div className="flex items-center gap-2 mb-4">
        <FilePlus className="text-[var(--peach-ink)]" size={18} />
        <h3 className="font-display text-lg">Submit a Contribution</h3>
      </div>

      <div className="relative mb-3 w-full" ref={dropdownRef}>
        <div
          onClick={() => setIsOpen(true)}
          className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm flex items-center justify-between cursor-pointer focus-within:border-[var(--peach-ink)]"
        >
          <div className="flex items-center gap-2 w-full">
            <Search size={16} className="text-[var(--ink-dim)] shrink-0" />
            <input
              type="text"
              placeholder={selectedSkillName || "Select a skill..."}
              value={isOpen ? searchQuery : selectedSkillName}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
                if (skillId) setSkillId('');
              }}
              onFocus={() => setIsOpen(true)}
              className="bg-transparent w-full focus:outline-none text-sm text-[var(--ink)] placeholder:text-[var(--ink-dim)]"
            />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-lg max-h-52 overflow-y-auto">
            {filteredSkills.length > 0 ? (
              filteredSkills.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSkillId(s.id);
                    setSearchQuery('');
                    setIsOpen(false);
                  }}
                  className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:bg-[var(--surface,rgba(255,255,255,0.05))] transition-colors ${
                    skillId === s.id ? 'bg-[var(--peach)] text-[var(--peach-ink)] font-medium' : 'text-[var(--ink)]'
                  }`}
                >
                  <span>{s.name}</span>
                  {skillId === s.id && <Check size={14} className="text-[var(--peach-ink)]" />}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-[var(--ink-dim)] text-center">
                No matching skills found
              </div>
            )}
          </div>
        )}
      </div>

      <input
        type="text"
        placeholder="Title (e.g. Edited recruitment video)"
        value={title}
        onChange={(e) => setTitle(enforceWordLimit(e.target.value.slice(0, TEXT_LIMITS.contributionTitle)))}
        maxLength={TEXT_LIMITS.contributionTitle}
        className="w-full p-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none mb-1"
        required
      />
      <p className="text-xs text-[var(--ink-dim)] text-right mb-3">{title.length}/{TEXT_LIMITS.contributionTitle}</p>

      <textarea
        placeholder="Describe what you did"
        value={description}
        onChange={(e) => setDescription(enforceWordLimit(e.target.value.slice(0, TEXT_LIMITS.contributionDescription)))}
        maxLength={TEXT_LIMITS.contributionDescription}
        className="w-full p-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none mb-1"
        rows={3}
      />
      <p className="text-xs text-[var(--ink-dim)] text-right mb-3">{description.length}/{TEXT_LIMITS.contributionDescription}</p>

      <label className="flex items-center gap-2 text-sm text-[var(--ink-dim)] mb-1 cursor-pointer border border-dashed border-[var(--border)] rounded-xl p-3 hover:border-[var(--peach-ink)] transition-colors">
        <Upload size={16} />
        <span className="truncate">{file ? file.name : 'Attach a photo of your work (recommended)'}</span>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
      </label>
      <p className="text-xs text-[var(--ink-dim)] mb-4">Max file size: 5MB</p>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-sm disabled:opacity-50 cursor-pointer">
        {submitting ? 'Submitting...' : 'Submit Contribution'}
      </button>
    </form>
  );
}