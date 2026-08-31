/**
 * Combine Add-QR fields into a phone-scannable payload.
 * Never invents a custom binary format — URL, vCard 3.0, or labeled text.
 */

export interface QrFields {
  url: string;
  text: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  etsy: string;
}

export const EMPTY_QR_FIELDS: QrFields = {
  url: '',
  text: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  etsy: '',
};

export type QrEncodeKind = 'empty' | 'url' | 'vcard' | 'text';

export interface QrPayloadResult {
  payload: string;
  kind: QrEncodeKind;
}

const SOCIAL_KEYS = [
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['tiktok', 'TikTok'],
  ['etsy', 'Etsy'],
] as const;

function trim(value: string | undefined): string {
  return (value ?? '').trim();
}

/** Treat blank and scheme-only placeholders as unset. */
export function meaningfulUrl(value: string | undefined): string {
  const next = trim(value);
  if (!next) return '';
  if (next === 'https://' || next === 'http://' || next === 'https:///' || next === 'http:///') return '';
  return next;
}

function websiteUrl(fields: QrFields): string {
  return meaningfulUrl(fields.url);
}

function socialEntries(fields: QrFields): { label: string; url: string }[] {
  return SOCIAL_KEYS
    .map(([key, label]) => ({ label, url: meaningfulUrl(fields[key]) }))
    .filter((entry) => entry.url);
}

export function hasContactFields(fields: QrFields): boolean {
  return !!(trim(fields.name) || trim(fields.phone) || trim(fields.email) || trim(fields.address));
}

function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function buildVCard(
  fields: QrFields,
  url: string,
  text: string,
  socials: { label: string; url: string }[],
): string {
  const name = trim(fields.name);
  const phone = trim(fields.phone);
  const email = trim(fields.email);
  const address = trim(fields.address);
  const fn = name || email || phone || 'Contact';

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(fn)}`,
  ];
  if (name) {
    const parts = name.split(/\s+/);
    const last = parts.length > 1 ? parts.pop()! : '';
    const first = parts.join(' ');
    lines.push(`N:${escapeVCard(last)};${escapeVCard(first)};;;`);
  }
  if (phone) lines.push(`TEL:${escapeVCard(phone)}`);
  if (email) lines.push(`EMAIL:${escapeVCard(email)}`);
  if (address) {
    lines.push(`ADR;TYPE=HOME:;;${escapeVCard(address.replace(/\n/g, ' '))};;;;`);
  }
  if (url) lines.push(`URL:${escapeVCard(url)}`);
  for (const social of socials) {
    lines.push(`URL:${escapeVCard(social.url)}`);
  }
  if (text) lines.push(`NOTE:${escapeVCard(text)}`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

function labeledText(
  url: string,
  text: string,
  socials: { label: string; url: string }[],
): string {
  const lines: string[] = [];
  if (url) lines.push(`URL: ${url}`);
  if (text) lines.push(`Text: ${text}`);
  for (const social of socials) {
    lines.push(`${social.label}: ${social.url}`);
  }
  return lines.join('\n');
}

export function normalizeQrFields(partial?: Partial<QrFields> | null): QrFields {
  return { ...EMPTY_QR_FIELDS, ...(partial ?? {}) };
}

export function buildQrPayload(fields: QrFields): QrPayloadResult {
  const url = websiteUrl(fields);
  const text = trim(fields.text);
  const socials = socialEntries(fields);

  if (hasContactFields(fields)) {
    return {
      payload: buildVCard(fields, url, text, socials),
      kind: 'vcard',
    };
  }

  const urlLike: { label: string; url: string }[] = [];
  if (url) urlLike.push({ label: 'URL', url });
  urlLike.push(...socials);

  if (!text && urlLike.length === 0) {
    return { payload: '', kind: 'empty' };
  }
  if (!text && urlLike.length === 1) {
    return { payload: urlLike[0].url, kind: 'url' };
  }
  if (text && urlLike.length === 0) {
    return { payload: text, kind: 'text' };
  }

  return { payload: labeledText(url, text, socials), kind: 'text' };
}
