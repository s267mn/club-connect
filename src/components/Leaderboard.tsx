'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal } from 'lucide-react';
import { calculateOverallRating } from '@/lib/ratingFormula';

type Tab = 'overall' | 'skills' | 'contri' | 'clubs';
type LeaderRow = { userId: string; name: string; value: number };
type Skill = { id: string; name: string };

export default function Leaderboard() {
  const [tab, setTab] = useState<Tab>('overall');
  const [loading, setLoading] = useState(true);
  const [overallRows, setOverallRows] = useState<LeaderRow[]>([]);
  const [contriRows, setContriRows] = useState<LeaderRow[]>([]);
  const [clubRows, setClubRows] = useState<LeaderRow[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [skillRows, setSkillRows] = useState<LeaderRow[]>([]);
  const [skillLoading, setSkillLoading] = useState(false);

  useEffect(() => {
    const loadBase = async () => {
      setLoading(true);

      const { data: users } = await supabase.from('users').select('id, name');
      const { data: contribs } = await supabase
        .from('contributions')
        .select('user_id, score, skill_id')
        .eq('status', 'verified');
      const { data: members } = await supabase.from('club_members').select('user_id');
      const { data: skillList } = await supabase.from('skills').select('id, name');

      setSkills(skillList ?? []);

      const usersById: { [id: string]: string } = {};
      (users ?? []).forEach((u: any) => { usersById[u.id] = u.name; });

      const perUser: { [uid: string]: { total: number; count: number; skillSet: Set<string> } } = {};
      (contribs ?? []).forEach((c: any) => {
        if (!perUser[c.user_id]) perUser[c.user_id] = { total: 0, count: 0, skillSet: new Set() };
        perUser[c.user_id].total += c.score;
        perUser[c.user_id].count += 1;
        if (c.skill_id) perUser[c.user_id].skillSet.add(c.skill_id);
      });

      const clubCountByUser: { [uid: string]: number } = {};
      (members ?? []).forEach((m: any) => {
        clubCountByUser[m.user_id] = (clubCountByUser[m.user_id] ?? 0) + 1;
      });

      const overall: LeaderRow[] = Object.entries(perUser).map(([uid, agg]) => {
        const avgScore = agg.total / agg.count;
        const rating = calculateOverallRating({
          avgScore,
          contributionCount: agg.count,
          distinctSkills: agg.skillSet.size,
          clubsJoined: clubCountByUser[uid] ?? 0,
        });
        return { userId: uid, name: usersById[uid] ?? 'Unknown', value: rating };
      }).sort((a, b) => b.value - a.value);

      const contri: LeaderRow[] = Object.entries(perUser)
        .map(([uid, agg]) => ({ userId: uid, name: usersById[uid] ?? 'Unknown', value: agg.count }))
        .sort((a, b) => b.value - a.value);

      const clubs: LeaderRow[] = Object.entries(clubCountByUser)
        .map(([uid, count]) => ({ userId: uid, name: usersById[uid] ?? 'Unknown', value: count }))
        .sort((a, b) => b.value - a.value);

      setOverallRows(overall);
      setContriRows(contri);
      setClubRows(clubs);
      setLoading(false);
    };

    loadBase();
  }, []);

  useEffect(() => {
    if (tab !== 'skills' || !selectedSkillId) return;

    const loadSkillRows = async () => {
      setSkillLoading(true);
      const { data: contribs, error } = await supabase
        .from('contributions')
        .select('user_id, score, users!contributions_user_id_fkey(name)')
        .eq('status', 'verified')
        .eq('skill_id', selectedSkillId);

      const perUser: { [uid: string]: { total: number; count: number; name: string } } = {};
      (contribs as any[] ?? []).forEach((c) => {
        if (!perUser[c.user_id]) perUser[c.user_id] = { total: 0, count: 0, name: c.users?.name ?? 'Unknown' };
        perUser[c.user_id].total += c.score;
        perUser[c.user_id].count += 1;
      });

      const rows: LeaderRow[] = Object.entries(perUser)
        .map(([uid, agg]) => ({ userId: uid, name: agg.name, value: Math.round(agg.total / agg.count) }))
        .sort((a, b) => b.value - a.value);

      setSkillRows(rows);
      setSkillLoading(false);
    };

    loadSkillRows();
  }, [tab, selectedSkillId]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'skills', label: 'Skills' },
    { key: 'contri', label: 'Contri' },
    { key: 'clubs', label: 'Clubs' },
  ];

  const rowsForTab: LeaderRow[] =
    tab === 'overall' ? overallRows :
    tab === 'contri' ? contriRows :
    tab === 'clubs' ? clubRows :
    skillRows;

  const valueLabel =
    tab === 'overall' ? 'Rating' :
    tab === 'contri' ? 'Contributions' :
    tab === 'clubs' ? 'Clubs' :
    'Avg Score';

  const medalColor = (i: number) => i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-[var(--ink-dim)]';

  const podiumOrder = [1, 0, 2]; // left=#2, center=#1, right=#3
  const podiumHeights = [90, 120, 70]; // px, matches podiumOrder positions
  const podiumBg = ['bg-gray-300', 'bg-yellow-400', 'bg-amber-600'];
  const showPodium = rowsForTab.length >= 1 && !(tab === 'skills' && !selectedSkillId) && !loading && !(tab === 'skills' && skillLoading);

  return (
    <div className="card p-6 fade-up">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="text-[var(--peach-ink)]" size={18} />
        <h2 className="text-sm font-semibold text-[var(--ink-dim)] uppercase tracking-wide">Leaderboard</h2>
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              tab === t.key
                ? 'bg-[var(--peach-ink)] text-white border-[var(--peach-ink)]'
                : 'border-[var(--border)] text-[var(--ink-dim)] hover:border-[var(--peach-ink)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'skills' && (
        <div className="mb-4">
          <select
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
            className="w-full max-w-xs p-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none"
          >
            <option value="">Select a skill</option>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Podium for top 3 */}
      {showPodium && (
        <div className="flex items-end justify-center gap-3 mb-5 px-2">
          {podiumOrder.map((rankIdx, posIdx) => {
            const row = rowsForTab[rankIdx];
            if (!row) return <div key={posIdx} className="flex-1 max-w-[90px]" />;
            return (
              <div key={row.userId} className="flex-1 max-w-[90px] flex flex-col items-center">
                <Medal size={20} className={medalColor(rankIdx)} />
                <p className="text-xs font-medium text-center mt-1 truncate w-full" title={row.name}>{row.name}</p>
                <p className="text-xs text-[var(--ink-dim)] mb-1.5">{row.value}</p>
                <div
                  className={`w-full rounded-t-lg ${podiumBg[posIdx]} flex items-start justify-center pt-1.5`}
                  style={{ height: `${podiumHeights[posIdx]}px` }}
                >
                  <span className="font-display text-lg text-white/90">{rankIdx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Self-scrolling rectangle */}
      <div className="max-h-72 overflow-y-auto border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
        {tab === 'skills' && !selectedSkillId ? (
          <p className="px-4 py-8 text-sm text-[var(--ink-dim)] text-center">Select a skill to see rankings.</p>
        ) : (loading || (tab === 'skills' && skillLoading)) ? (
          <p className="px-4 py-8 text-sm text-[var(--ink-dim)] text-center">Loading...</p>
        ) : rowsForTab.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[var(--ink-dim)] text-center">No data yet.</p>
        ) : (
          rowsForTab.slice(0, 20).map((row, i) => (
            <div key={row.userId} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`font-display text-sm w-5 ${medalColor(i)}`}>
                  {i < 3 ? <Medal size={15} className={medalColor(i)} /> : `#${i + 1}`}
                </span>
                <span className="text-sm">{row.name}</span>
              </div>
              <div className="text-sm font-semibold">
                {row.value} <span className="text-xs text-[var(--ink-dim)] font-normal">{valueLabel}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}