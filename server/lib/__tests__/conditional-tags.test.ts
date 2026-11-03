import { describe, it, expect } from 'vitest';
import { processConditionalTags } from '../conditionalTags';

const ALL = 'a[IF FOB]f[/IF][IF CRC]c[/IF][IF CMOS]m[/IF]z';
const VERBOSE_CRC = "[IF CLIENT HAS ELECTED 'CLIENT-RETAINED CONTRACTOR (CRC)':]x";
const VERBOSE_CMOS = "[IF CLIENT HAS ELECTED 'COMPANY-MANAGED ON-SITE SERVICES (CMOS)':]y";

describe('processConditionalTags', () => {
  it('keeps only the FOB block for FOB', () => {
    expect(processConditionalTags(ALL, 'FOB')).toBe('afz');
  });

  it('keeps only the CRC block for CRC', () => {
    expect(processConditionalTags(ALL, 'CRC')).toBe('acz');
  });

  it('keeps only the CMOS block for CMOS', () => {
    expect(processConditionalTags(ALL, 'CMOS')).toBe('amz');
  });

  it('drops verbose CRC and CMOS headers and their content for FOB', () => {
    expect(processConditionalTags(VERBOSE_CRC, 'FOB')).toBe('');
    expect(processConditionalTags(VERBOSE_CMOS, 'FOB')).toBe('');
  });

  it('never leaves an [IF tag in FOB output', () => {
    expect(processConditionalTags(ALL + VERBOSE_CRC + VERBOSE_CMOS, 'FOB')).not.toContain('[IF');
  });

  it('keeps today\'s verbose handling for CRC and CMOS', () => {
    expect(processConditionalTags(VERBOSE_CRC + VERBOSE_CMOS, 'CRC')).toBe('x');
    expect(processConditionalTags(VERBOSE_CRC + VERBOSE_CMOS, 'CMOS')).toBe('y');
  });

  it('keeps the legacy CLIENT-RETAINED and COMPANY-MANAGED aliases', () => {
    const s = '[IF CLIENT-RETAINED]r[/IF][IF COMPANY-MANAGED]g[/IF]';
    expect(processConditionalTags(s, 'CRC')).toBe('r');
    expect(processConditionalTags(s, 'CMOS')).toBe('g');
    expect(processConditionalTags(s, 'FOB')).toBe('');
  });

  it('returns an empty string for empty content', () => {
    expect(processConditionalTags('', 'FOB')).toBe('');
  });
});
