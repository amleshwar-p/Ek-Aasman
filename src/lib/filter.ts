import { STATES } from './india';

// A starter blocklist of common English and Hindi/Hinglish abuse. Extend it as you see what people try.
// Words of 4+ letters are matched anywhere (after removing spaces and look-alike characters);
// shorter ones only as whole words, so ordinary names don't get caught.
const LONG = [
  'fuck', 'fuk', 'shit', 'bitch', 'bastard', 'asshole', 'cunt', 'slut', 'whore', 'rape', 'rapist', 'nigga', 'nigger',
  'porn', 'pussy', 'boobs', 'penis', 'vagina', 'dildo', 'horny', 'sexy',
  'chutiya', 'chutia', 'chootiya', 'chodu', 'bhosdi', 'bhosda', 'bhosdike', 'madarchod', 'maderchod', 'behenchod',
  'bhenchod', 'benchod', 'bhanchod', 'gandu', 'gaand', 'gand mar', 'lauda', 'lavda', 'lawda', 'lund', 'randi',
  'raand', 'harami', 'haraami', 'kamina', 'kutiya', 'jhaat', 'jhant', 'chinal', 'bhadwa', 'bhadva', 'tatti',
  'hijra', 'chakka', 'suar ki', 'kutte ki'
];
const SHORT = ['mc', 'bc', 'bkl', 'mkc', 'bsdk', 'gf', 'sex', 'xxx', 'lodu', 'loda', 'ass', 'dick', 'fck', 'wtf'];

const LOOK = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i' } as Record<string, string>;
function norm(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[0134578@$!]/g, (c) => LOOK[c] || c);
}
export function isClean(s: string) {
  const n = norm(s);
  const squashed = n.replace(/[^a-z]/g, '');
  if (LONG.some((w) => squashed.includes(w.replace(/[^a-z]/g, '')))) return false;
  const words = n.split(/[^a-z]+/).filter(Boolean);
  if (SHORT.some((w) => words.includes(w))) return false;
  return true;
}
function tidy(raw: unknown, max: number) {
  if (typeof raw !== 'string') return null;
  const s = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > max) return null;
  // letters (any script, so Hindi works), spaces, dot, apostrophe, hyphen. No digits, links or handles.
  if (!/^[\p{L}\p{M} .'-]+$/u.test(s)) return null;
  if (!isClean(s)) return null;
  return s.replace(/(^|\s)(\p{Ll})/gu, (_m, a, b) => a + b.toUpperCase());
}
export const cleanName = (raw: unknown) => tidy(raw, 20);
export const cleanCity = (raw: unknown) => tidy(raw, 30);
export function cleanState(raw: unknown) {
  return typeof raw === 'string' && (STATES as readonly string[]).includes(raw) ? raw : null;
}
