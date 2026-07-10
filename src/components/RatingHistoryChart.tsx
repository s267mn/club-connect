'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateOverallRating } from '@/lib/ratingFormula';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';

type HistoryPoint = { index: number; rating: number; title: string; date: string };

export default function RatingHistoryChart({ userId }: { userId: string }) {
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: contribs } = await supabase
        .from('contributions')
        .select('id, title, score, skill_id, created_at')
        .eq('user_id', userId)
        .eq('status', 'verified')
        .order('created_at', { ascending: true });

      const contribList = contribs ?? [];

      if (contribList.length === 0) {
        setPoints([]);
        setLoading(false);
        return;
      }

      // Clubs joined is treated as a constant (current count) since we don't track
      // historical join dates — reasonable approximation for the trend line.
      const { count: clubCount } = await supabase
        .from('club_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const history: HistoryPoint[] = [];
      let runningTotal = 0;
      const skillSet = new Set<string>();

      history.push({ index: 0, rating: 400, title: 'Start', date: '' });

      contribList.forEach((c: any, i: number) => {
        runningTotal += c.score;
        if (c.skill_id) skillSet.add(c.skill_id);

        const avgScore = runningTotal / (i + 1);
        const rating = calculateOverallRating({
          avgScore,
          contributionCount: i + 1,
          distinctSkills: skillSet.size,
          clubsJoined: clubCount ?? 0,
        });

        history.push({
          index: i + 1,
          rating,
          title: c.title,
          date: new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        });
      });

      setPoints(history);
      setLoading(false);
    };

    load();
  }, [userId]);

  if (loading) return null;
  if (points.length < 2) {
    return (
      <div className="card p-6 fade-up">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="text-[var(--peach-ink)]" size={18} />
          <h2 className="text-sm font-semibold text-[var(--ink-dim)] uppercase tracking-wide">Rating History</h2>
        </div>
        <p className="text-sm text-[var(--ink-dim)] py-6 text-center">Need at least 1 verified contribution to show a trend.</p>
      </div>
    );
  }

  return (
    <div className="card p-6 fade-up">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="text-[var(--peach-ink)]" size={18} />
        <h2 className="text-sm font-semibold text-[var(--ink-dim)] uppercase tracking-wide">Rating History</h2>
      </div>
      <ResponsiveContainer width="100%" height={380}>
  <LineChart
    data={points}
    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
  >
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="var(--border)"
    />

    <XAxis
      dataKey="index"
      tick={{ fontSize: 11 }}
      stroke="var(--ink-dim)"
      tickFormatter={(v) => (v === 0 ? '' : `#${v}`)}
    />

    <YAxis
      domain={[
        0,
        (dataMax: number) => Math.ceil(dataMax / 100) * 100,
      ]}
      tick={{ fontSize: 11 }}
      stroke="var(--ink-dim)"
    />

    <Tooltip
      contentStyle={{
        fontSize: 12,
        borderRadius: 8,
        border: '1px solid var(--border)',
      }}
      formatter={(value: any) => [value, 'Rating']}
      labelFormatter={(_label, payload) => {
        const p = payload?.[0]?.payload;
        if (!p || p.index === 0) return 'Starting Rating';
        return `${p.title} · ${p.date}`;
      }}
    />

    <Line
      type="linear"
      dataKey="rating"
      stroke="var(--peach-ink)"
      strokeWidth={2}
      dot={{ r: 3 }}
      activeDot={{ r: 5 }}
    />
  </LineChart>
</ResponsiveContainer>
    </div>
  );
}