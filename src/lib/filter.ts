import { STATES } from './india';

// Blocklist of common English and Hindi/Hinglish abuse, in Roman letters and in Devanagari. Words added from
// the admin page (`extra`) are checked too. Roman words of 4+ letters are matched anywhere (after removing
// spaces and look-alike characters); shorter ones only as whole words, so ordinary names don't get caught.
const LONG = [
  'fuck', 'fuk', 'shit', 'bitch', 'bastard', 'asshole', 'cunt', 'slut', 'whore', 'rape', 'rapist', 'nigga', 'nigger',
  'porn', 'pussy', 'boobs', 'penis', 'vagina', 'dildo', 'horny', 'sexy', 'nude', 'dickhead', 'faggot', 'retard', 'hitler',
  'chutiya', 'chutia', 'chootiya', 'chutiye', 'chutya', 'chodu', 'chudai', 'chodna', 'bhosdi', 'bhosda', 'bhosdike',
  'bhosadi', 'bhosri', 'madarchod', 'maderchod', 'madarjat', 'behenchod', 'bhenchod', 'benchod', 'bhanchod', 'bahanchod',
  'betichod', 'bhenkelode', 'bhenkaloda', 'gandu', 'gaand', 'gand mar', 'gandmasti', 'lauda', 'lavda', 'lawda', 'lund', 'randi', 'raand', 'randwa', 'harami', 'haraami', 'haramzada', 'haramzade', 'harampana', 'kamina',
  'kutiya', 'kuttiya', 'jhaat', 'jhant', 'jhatu', 'jhaatu', 'chinal', 'chhinal', 'bhadwa', 'bhadva', 'bhadwe', 'bhadve',
  'tatti', 'hijra', 'hijde', 'suar ki', 'suarki', 'kutte ki', 'kuttekibacche', 'teri maa ki', 'tere baap ki',
  'maa ki aankh', 'maakichu', 'tharki', 'chut ke', 'chutke', 'katua', 'jihadi'
];
// short or name-like words (Claude, Boobalan, Chakkarapani, Katwa town) only count as whole words
const SHORT = ['mc', 'bc', 'bkl', 'mkc', 'bsdk', 'bsdke', 'gf', 'sex', 'xxx', 'lodu', 'loda', 'lode', 'laude', 'loude',
  'ass', 'dick', 'fck', 'wtf', 'chut', 'choot', 'chod', 'gand', 'tits', 'cock', 'fag', 'nazi', 'mf', 'stfu', 'chakka', 'boob'];
// Devanagari, compared after removing spaces, joiners and the nukta dot, so small spelling tricks don't slip past
const HINDI = [
  'चूतिया', 'चुतिया', 'चूतिये', 'चूत', 'चुदाई', 'चोद', 'भोसड़ी', 'भोसडी', 'भोसड़ा', 'भोसडा', 'भोसडीके', 'मादरचोद',
  'बहनचोद', 'बहनचोद', 'बेहनचोद', 'भेनचोद', 'बहनकेलौड़े', 'बेटीचोद', 'गांडू', 'गांड', 'गाण्ड', 'गान्ड', 'लौड़ा', 'लौडा',
  'लौड़े', 'लवड़ा', 'लवडा', 'लंड', 'लण्ड', 'लन्ड', 'रंडी', 'रण्डी', 'रन्डी', 'हरामी', 'हरामज़ादा', 'हरामजादा', 'हरामखोर',
  'कमीना', 'कमीने', 'कुतिया', 'कुत्तिया', 'झांट', 'झाट', 'झाटू', 'छिनाल', 'भड़वा', 'भडवा', 'भड़वे', 'टट्टी', 'हिजड़ा',
  'हिजडा', 'छक्का', 'सुअरकी', 'कुत्तेकी', 'तेरीमाँकी', 'तेरीमांकी', 'ठरकी', 'कटुआ', 'सेक्स'
];

const LOOK = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i' } as Record<string, string>;
function norm(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[0134578@$!]/g, (c) => LOOK[c] || c);
}
// Devanagari: drop spaces, zero-width joiners and the nukta, and treat chandrabindu like anusvara
const dev = (s: string) => s.normalize('NFC').replace(/[\s​-‍़.'-]/g, '').replace(/ँ/g, 'ं');
const DEV_LIST = HINDI.map(dev);
const isDev = (w: string) => /[ऀ-ॿ]/.test(w);

export function isClean(s: string, extra: string[] = []) {
  const n = norm(s);
  const squashed = n.replace(/[^a-z]/g, '');
  const words = n.split(/[^a-z]+/).filter(Boolean);
  const longs = LONG.concat(extra.filter((w) => !isDev(w) && w.replace(/[^a-z]/gi, '').length >= 4));
  const shorts = SHORT.concat(extra.filter((w) => !isDev(w) && w.replace(/[^a-z]/gi, '').length < 4).map((w) => w.toLowerCase()));
  if (longs.some((w) => squashed.includes(norm(w).replace(/[^a-z]/g, '')))) return false;
  if (shorts.some((w) => words.includes(w))) return false;
  const d = dev(s);
  if (d && DEV_LIST.concat(extra.filter(isDev).map(dev)).some((w) => w && d.includes(w))) return false;
  return true;
}
function tidy(raw: unknown, max: number, extra: string[]) {
  if (typeof raw !== 'string') return null;
  const s = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > max) return null;
  // letters (any script, so Hindi works), spaces, dot, apostrophe, hyphen. No digits, links or handles.
  if (!/^[\p{L}\p{M} .'-]+$/u.test(s)) return null;
  if (!isClean(s, extra)) return null;
  return s.replace(/(^|\s)(\p{Ll})/gu, (_m, a, b) => a + b.toUpperCase());
}
export const cleanName = (raw: unknown, extra: string[] = []) => tidy(raw, 20, extra);
export const cleanCity = (raw: unknown, extra: string[] = []) => tidy(raw, 30, extra);
export function cleanState(raw: unknown) {
  return typeof raw === 'string' && (STATES as readonly string[]).includes(raw) ? raw : null;
}
