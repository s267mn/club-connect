'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface ResumeHistoryRow {
  id: string;
  file_path: string;
  generated_at: string;
}

interface ResumeEntry extends ResumeHistoryRow {
  signedUrl: string | null;
}

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour, plenty for viewing/downloading in one sitting

function formatFileName(filePath: string): string {
  const rawName = filePath.split('/').pop() ?? filePath;
  const withoutTimestampPrefix = rawName.replace(/^\d+_/, '');
  return decodeURIComponent(withoutTimestampPrefix);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ResumeHistoryPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState<ResumeEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUid = sessionData.session?.user.id;

      if (!authUid) {
        router.push('/login');
        return;
      }

      setChecking(false);

      const { data: rows, error: fetchError } = await supabase
        .from('resume_history')
        .select('id, file_path, generated_at')
        .eq('user_id', authUid)
        .order('generated_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to load resume history:', fetchError);
        setError('Could not load your resume history.');
        setLoading(false);
        return;
      }

      const historyRows = (rows ?? []) as ResumeHistoryRow[];

      const withSignedUrls: ResumeEntry[] = await Promise.all(
        historyRows.map(async (row) => {
          const { data: signedData, error: signError } =
            await supabase.storage
              .from('resumes')
              .createSignedUrl(row.file_path, SIGNED_URL_TTL_SECONDS);

          if (signError) {
            console.error(
              `Failed to sign URL for ${row.file_path}:`,
              signError
            );
          }

          return {
            ...row,
            signedUrl: signedData?.signedUrl ?? null,
          };
        })
      );

      setEntries(withSignedUrls);
      setLoading(false);
    };

    init();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">
        Loading...
      </div>
    );
  }

  return (
    <main className="p-6 md:p-10 max-w-4xl mx-auto">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] mb-6 fade-up transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Profile
      </Link>

      <div className="flex items-center gap-2 mb-7 fade-up">
        <FileText size={22} className="text-[var(--peach-ink)]" />
        <h1 className="font-display text-2xl">Resume History</h1>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-[var(--ink-dim)] fade-up">
          Loading your resumes...
        </div>
      ) : error ? (
        <div className="card p-8 text-center text-sm text-red-600 fade-up">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-8 text-center fade-up">
          <p className="text-sm text-[var(--ink-dim)]">
            You haven&apos;t generated a resume yet. Head to your
            profile to create your first one.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                className="card p-5 fade-up"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {formatFileName(entry.file_path)}
                    </p>
                    <p className="text-xs text-[var(--ink-dim)] mt-0.5">
                      Generated {formatDate(entry.generated_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {entry.signedUrl && (
                      <a
                        href={entry.signedUrl}
                        download={formatFileName(entry.file_path)}
                        className="inline-flex items-center gap-1.5 text-xs border border-[var(--border)] rounded-lg px-3 py-2 hover:border-[var(--peach-ink)] transition-colors"
                      >
                        <Download size={13} />
                        Download
                      </a>
                    )}

                    <button
                      type="button"
                      disabled={!entry.signedUrl}
                      onClick={() =>
                        setExpandedId(
                          isExpanded ? null : entry.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-xs border border-[var(--border)] rounded-lg px-3 py-2 hover:border-[var(--peach-ink)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={13} />
                          Hide preview
                        </>
                      ) : (
                        <>
                          <ChevronDown size={13} />
                          Preview
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {!entry.signedUrl && (
                  <p className="text-xs text-red-600 mt-3">
                    Preview unavailable for this resume.
                  </p>
                )}

                {isExpanded && entry.signedUrl && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-[var(--border)]">
                    <iframe
                      src={entry.signedUrl}
                      title={formatFileName(entry.file_path)}
                      className="w-full h-[600px] bg-white"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}