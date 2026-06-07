'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

/**
 * Binary sun/moon theme toggle.
 *
 * `system` is the initial default (set in next-themes via `defaultTheme="system"`),
 * but clicking the toggle never returns to `system` — it flips between `light`
 * and `dark` based on the currently *resolved* theme.
 *
 * Icon visibility is driven by the `.dark` class on `<html>` so the markup is
 * identical on the server and the client (no hydration mismatch, no
 * setState-in-effect mounted gate).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const handleToggle = () => {
    // Fall back to flipping `dark` based on whichever resolved theme next-themes
    // currently reports. Defaults to `light → dark` if resolvedTheme is unknown.
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="relative"
    >
      <Sun
        className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
        aria-hidden
      />
      <Moon
        className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
        aria-hidden
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
