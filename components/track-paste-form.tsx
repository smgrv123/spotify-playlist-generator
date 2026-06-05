import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { parseTracks } from '@/lib/track-parser';
import { useResolveTracks } from '@/hooks/use-resolve-tracks';
import { ResolvedTrack, FailedTrack } from '@/lib/types';

interface TrackPasteFormProps {
  onTracksResolved: (tracks: (ResolvedTrack | FailedTrack)[]) => void;
}

export function TrackPasteForm({ onTracksResolved }: TrackPasteFormProps) {
  const [pasteValue, setPasteValue] = useState('');
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const { mutate: resolveTracks, isPending: isResolving, error: resolveError } = useResolveTracks();

  const handleResolve = () => {
    setParseError(null);
    setParseWarnings([]);

    const { tracks: parsedTracks, warnings, error } = parseTracks(pasteValue);
    setParseWarnings(warnings);

    if (error) {
      setParseError(error);
      return;
    }

    resolveTracks(parsedTracks, {
      onSuccess: (data) => {
        setParseWarnings([]);
        onTracksResolved(data);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="track-paste">Paste Tracks</Label>
        <Textarea
          id="track-paste"
          placeholder={`Title - Artist\nAnother Song - Another Artist\n\nOr JSON: [{"title":"Song","artist":"Artist","album":"Album"}]`}
          value={pasteValue}
          onChange={(event) => setPasteValue(event.target.value)}
          className="min-h-[160px]"
        />
        <p className="text-xs text-muted-foreground">
          Use one track per line in <strong>Title - Artist</strong> format, or paste a JSON array
          with <strong>title</strong>, <strong>artist</strong>, and optional <strong>album</strong>.
        </p>
      </div>

      {parseWarnings.length > 0 && (
        <Alert
          variant="default"
          className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-400"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col gap-1">
              {parseWarnings.map((warning, index) => (
                <span key={index}>{warning}</span>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {resolveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{resolveError.message}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleResolve} disabled={isResolving || !pasteValue.trim()}>
        {isResolving ? 'Resolving...' : 'Resolve Tracks'}
      </Button>
    </div>
  );
}
