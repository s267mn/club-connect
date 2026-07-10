// ClubConnect Rating (CCR)
//
// Rating Guide:
// 400–600   : New Contributor
// 600–800   : Active Contributor
// 800–1000  : Trusted Contributor
// 1000–1200 : Excellent Contributor
// 1200–1400 : Campus Standout
// 1400–1600 : Elite Contributor
// 1600+     : ClubConnect Legend

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
  // Everyone starts at 400
  if (contributionCount === 0) return 400;

  /**
   * Confidence Factor
   * A user's average becomes more trustworthy
   * as they make more verified contributions.
   */
  const confidence =
    0.65 + 0.35 * (1 - Math.exp(-contributionCount / 12));

  const effectiveAverage = avgScore * confidence;

  let rating = 400;

  // Quality (MOST IMPORTANT)
  rating += effectiveAverage * 5;

  // Experience
  rating += 40 * Math.log2(contributionCount + 1);

  // Skill Diversity
  rating += 8 * Math.sqrt(distinctSkills);

  // Multi-Club Activity
  rating += 5 * Math.sqrt(clubsJoined);

  return Math.round(rating);
}