// Shared overall rating formula — used by both the profile page and the leaderboard.
// Keep this as the single source of truth so both places always agree.

export function calculateOverallRating({
  avgScore,
  contributionCount,
  distinctSkills,
  clubsJoined,
}: {
  avgScore: number;
  contributionCount: number;
  distinctSkills: number;
  clubsJoined: number;
}): number {
  if (contributionCount === 0) return 0;

  const consistencyFactor = Math.min(1 + (contributionCount - 1) * 0.05, 1.5);
  const versatilityBonus = distinctSkills * 2 + clubsJoined * 1;

  const rating = avgScore * consistencyFactor + versatilityBonus;
  return Math.round(rating * 10) / 10; // round to 1 decimal
}