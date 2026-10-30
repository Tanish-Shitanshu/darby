import { describe, expect, it } from 'vitest';
import { languageOf } from './voice';

describe('languageOf', () => {
  it('keeps a non-English label from speech-to-text', () => { expect(languageOf('ta-IN', 'hello')).toBe('ta-IN'); });
  it('lets the script override a wrong English label', () => {
    expect(languageOf('en-IN', 'इस पेज की कीमत बताओ')).toBe('hi-IN');
    expect(languageOf(undefined, 'এই পাতার দাম')).toBe('bn-IN');
  });
  it('stays English for plain English', () => { expect(languageOf('en-IN', 'what is the price')).toBe('en-IN'); expect(languageOf(null, 'hello')).toBe('en-IN'); });
});
