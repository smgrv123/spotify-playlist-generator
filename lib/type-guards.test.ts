import { describe, expect, it } from 'vitest';

import { VISIBILITY } from './constants';
import { isVisibility } from './type-guards';

describe('isVisibility', () => {
  it.each(Object.values(VISIBILITY))('accepts "%s"', (value) => {
    expect(isVisibility(value)).toBe(true);
  });

  it.each(['', 'PUBLIC', 'Private', 'collaborative', ' public'])('rejects "%s"', (value) => {
    expect(isVisibility(value)).toBe(false);
  });
});
