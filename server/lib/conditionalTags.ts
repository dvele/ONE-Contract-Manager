import type { DeliveryModel } from '../../shared/deliveryModel';

const CRC_VERBOSE_HEADER = "\\[IF CLIENT HAS ELECTED ['']CLIENT-RETAINED CONTRACTOR \\(CRC\\)['']:?\\]";
const CMOS_VERBOSE_HEADER = "\\[IF CLIENT HAS ELECTED ['']COMPANY-MANAGED ON-SITE SERVICES \\(CMOS\\)['']:?\\]";

// Tag names accepted in [IF X]...[/IF], including the legacy long forms, and the model each one means
const TAG_MODELS: Record<string, DeliveryModel> = {
  FOB: 'FOB',
  CRC: 'CRC',
  'CLIENT-RETAINED': 'CRC',
  CMOS: 'CMOS',
  'COMPANY-MANAGED': 'CMOS',
};

/**
 * Process [IF FOB]/[IF CRC]/[IF CMOS] conditional tags in content
 * Removes content wrapped in tags for the other delivery models
 * Strips the literal [IF ...] and [/IF] tags from output
 */
export function processConditionalTags(content: string, model: DeliveryModel): string {
  if (!content) return '';

  let result = content;

  // Handle verbose conditional format from exhibits FIRST
  // [IF CLIENT HAS ELECTED 'CLIENT-RETAINED CONTRACTOR (CRC)':] ... content until next [IF or end
  const verbose: Array<[string, DeliveryModel]> = [
    [CMOS_VERBOSE_HEADER, 'CMOS'],
    [CRC_VERBOSE_HEADER, 'CRC'],
  ];
  // Remove the other models' blocks first (from header to next [IF or end of content)...
  for (const [header, headerModel] of verbose) {
    if (headerModel !== model) {
      result = result.replace(
        new RegExp(`${header}([\\s\\S]*?)(?=\\[IF CLIENT HAS ELECTED|$)`, 'gi'),
        ''
      );
    }
  }
  // ...then unwrap the elected block (keep content, remove header)
  for (const [header, headerModel] of verbose) {
    if (headerModel === model) {
      result = result.replace(new RegExp(`${header}\\s*`, 'gi'), '');
    }
  }

  // Keep the matching block's content, drop every other model's block
  result = result.replace(
    /\[IF\s+(FOB|CRC|CMOS|CLIENT-RETAINED|COMPANY-MANAGED)\]([\s\S]*?)\[\/IF\]/gi,
    (_match, tag: string, inner: string) => (TAG_MODELS[tag.toUpperCase()] === model ? inner : '')
  );

  // Remove any remaining [IF ...] and [/IF] tags that might have been left over
  result = result.replace(/\[IF\s+[A-Z_-]+\]/gi, '');
  result = result.replace(/\[\/IF\]/gi, '');

  return result.trim();
}
