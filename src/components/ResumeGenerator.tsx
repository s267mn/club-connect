'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileDown } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import {
  buildResumePdf,
  ResumeClubMembership,
  ResumeContributionData,
  ResumeSkillRatingData,
} from '@/lib/resumePdf';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface ResumeGeneratorProps {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  overallRating: number;
  totalVerified: number;
  memberships: ResumeClubMembership[];
  contributions: ResumeContributionData[];
  skillRatings: ResumeSkillRatingData[];
  lastResumeGeneratedAt: string | null;
  onGenerated: (generatedAt: string) => void;
}

function formatTimeRemaining(msRemaining: number): string {
  const hours = Math.ceil(msRemaining / (60 * 60 * 1000));

  if (hours >= 24) {
    const days = Math.ceil(hours / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

export default function ResumeGenerator({
  userId,
  name,
  email,
  avatarUrl,
  overallRating,
  totalVerified,
  memberships,
  contributions,
  skillRatings,
  lastResumeGeneratedAt,
  onGenerated,
}: ResumeGeneratorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!dialogOpen) return;

    setNow(Date.now());
  }, [dialogOpen]);

  const { onCooldown, msRemaining } = useMemo(() => {
    if (now === null) {
      return { onCooldown: false, msRemaining: 0 };
    }

    const lastGeneratedMs = lastResumeGeneratedAt
      ? new Date(lastResumeGeneratedAt).getTime()
      : null;

    const msSinceLast = lastGeneratedMs
      ? now - lastGeneratedMs
      : null;

    const isOnCooldown =
      msSinceLast !== null && msSinceLast < WEEK_MS;

    return {
      onCooldown: isOnCooldown,
      msRemaining: isOnCooldown
        ? WEEK_MS - (msSinceLast as number)
        : 0,
    };
  }, [lastResumeGeneratedAt, now]);

  const handleConfirmGenerate = async () => {
    if (onCooldown) {
      setDialogOpen(false);
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const doc = await buildResumePdf({
        name,
        email,
        avatarUrl,
        overallRating,
        totalVerified,
        memberships,
        contributions,
        skillRatings,
      });

      const fileName = `${name.replace(/\s+/g, '_')}_ClubConnect_Resume.pdf`;

      /* Auto-download to the user's device. */
      doc.save(fileName);

      /* Persist a copy to private storage for the history page. */
      const pdfBlob = doc.output('blob');
      const storagePath = `${userId}/${Date.now()}_${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(storagePath, pdfBlob, {
          contentType: 'application/pdf',
        });

      if (uploadError) {
        console.error(
          'Failed to store resume for history:',
          uploadError
        );
      } else {
        const { error: historyError } = await supabase
          .from('resume_history')
          .insert({
            user_id: userId,
            file_path: storagePath,
          });

        if (historyError) {
          console.error(
            'Failed to log resume history entry:',
            historyError
          );
        }
      }

      const generatedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('users')
        .update({ last_resume_generated_at: generatedAt })
        .eq('id', userId);

      if (updateError) {
        console.error(
          'Failed to record resume generation timestamp:',
          updateError
        );
      }

      onGenerated(generatedAt);
      setDialogOpen(false);
    } catch (err) {
      console.error('Failed to generate resume:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate resume.'
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError('');
          setDialogOpen(true);
        }}
        className="inline-flex items-center gap-2 text-xs text-[var(--ink-dim)] border border-dashed border-[var(--border)] rounded-lg px-3 py-2 hover:border-[var(--peach-ink)] transition-colors"
      >
        <FileDown size={13} />
        Generate Resume
      </button>

      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}

      <ConfirmDialog
        open={dialogOpen}
        title={
          onCooldown
            ? 'Resume already generated recently'
            : 'Generate your resume?'
        }
        message={
          onCooldown
            ? `You can generate a new resume once per week. Your next resume will be available in about ${formatTimeRemaining(
                msRemaining
              )}.`
            : "This creates a PDF resume from your verified ClubConnect profile — clubs, roles, verified contributions, and skill ratings. It'll download automatically and also be saved to your resume history. You can generate a new resume once per week, so make sure your profile is up to date first."
        }
        confirmLabel={onCooldown ? 'Got it' : 'Generate PDF'}
        cancelLabel={onCooldown ? 'Close' : 'Cancel'}
        variant="neutral"
        submitting={generating}
        onConfirm={handleConfirmGenerate}
        onCancel={() => setDialogOpen(false)}
      />
    </>
  );
}