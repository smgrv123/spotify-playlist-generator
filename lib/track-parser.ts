export type TrackInput = {
  title: string;
  artist: string;
  album?: string;
};

export type ParseResult = {
  tracks: TrackInput[];
  warnings: string[];
  error: string | null;
};

/**
 * Pure function to parse raw text (line items or JSON) into a standard track array.
 * Decoupled from React state for zero-dependency testability.
 */
export function parseTracks(raw: string): ParseResult {
  const trimmed = raw.trim();
  const warnings: string[] = [];
  const parsed: TrackInput[] = [];

  if (!trimmed) {
    return { tracks: parsed, warnings, error: 'Paste some tracks to resolve first.' };
  }

  const parseLineList = () => {
    const skipped: string[] = [];
    const lines = trimmed.split(/\r?\n/);
    lines.forEach((line) => {
      const clean = line.trim();
      if (!clean) return;

      let dividerIndex = clean.indexOf(' - ');
      let delimiterLength = 3;
      if (dividerIndex === -1) {
        dividerIndex = clean.indexOf('-');
        delimiterLength = 1;
      }

      if (dividerIndex === -1) {
        skipped.push(clean);
        return;
      }

      const title = clean.slice(0, dividerIndex).trim();
      const artist = clean.slice(dividerIndex + delimiterLength).trim();

      if (!title || !artist) {
        skipped.push(clean);
        return;
      }
      parsed.push({ title, artist });
    });

    if (skipped.length > 0) {
      warnings.push(
        `Skipped ${skipped.length} line${skipped.length === 1 ? '' : 's'} that could not be parsed.`
      );
    }
  };

  if (trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed);
      if (!Array.isArray(json)) {
        return { tracks: parsed, warnings, error: 'JSON input must be an array.' };
      }

      const skipped: number[] = [];
      json.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
          skipped.push(index + 1);
          return;
        }

        const title = typeof item.title === 'string' ? item.title.trim() : '';
        const artist = typeof item.artist === 'string' ? item.artist.trim() : '';
        const album = typeof item.album === 'string' ? item.album.trim() : undefined;

        if (!title || !artist) {
          skipped.push(index + 1);
          return;
        }
        parsed.push({ title, artist, album });
      });

      if (skipped.length > 0) {
        warnings.push(
          `Skipped ${skipped.length} JSON entr${skipped.length === 1 ? 'y' : 'ies'} missing title or artist.`
        );
      }
    } catch {
      return {
        tracks: parsed,
        warnings,
        error: 'Invalid JSON. Fix the syntax or paste line items.',
      };
    }
  } else {
    parseLineList();
  }

  if (parsed.length === 0) {
    return { tracks: parsed, warnings, error: 'No valid tracks found to resolve.' };
  }

  return { tracks: parsed, warnings, error: null };
}
