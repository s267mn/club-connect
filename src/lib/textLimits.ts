// Shared text input helpers — used across all free-text fields in the app.
// Enforces a silent per-word length cap (breaks up unreasonably long "words"
// by inserting a space) so no single unbroken token can ever overflow a
// card/flex layout, without telling the user this rule exists.

const MAX_WORD_LENGTH = 20;

// Centralized character limits — change a number here, it applies everywhere
// that field is used. Each page still needs its own maxLength={...} prop
// pointing at these constants (character limits differ per field), but the
// actual numbers only ever live in this one place.
export const TEXT_LIMITS = {
  contributionTitle: 100,
  contributionDescription: 1000,
  clubName: 60,
  clubDescription: 500,
  comment: 500,
  joinMessage: 300,
};

export function enforceWordLimit(value: string): string {
  return value
    .split(' ')
    .map((word) => {
      if (word.length <= MAX_WORD_LENGTH) return word;
      // Break the long word into MAX_WORD_LENGTH-sized chunks with spaces between.
      const chunks: string[] = [];
      for (let i = 0; i < word.length; i += MAX_WORD_LENGTH) {
        chunks.push(word.slice(i, i + MAX_WORD_LENGTH));
      }
      return chunks.join(' ');
    })
    .join(' ');
}