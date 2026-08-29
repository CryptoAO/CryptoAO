// Anti-disintermediation: detect and mask contact details in chat messages
// so deals (and payments) stay on-platform. This is deliberately aggressive —
// a masked digit run in a chat is a much smaller cost than a deal leaking
// off-platform, which removes escrow protection from BOTH sides.

const MASK = "▓▓▓";

// Digit words in English + Tagalog used to spell numbers ("zero nine one seven…")
const DIGIT_WORDS = new Set([
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "sero", "isa", "dalawa", "tatlo", "apat", "lima", "anim", "pito", "walo", "siyam",
  "oh", "o",
]);

const PATTERNS: RegExp[] = [
  // PH mobile numbers with any separators: 09171234567, +63 917 123 4567, 0917-123-45-67
  /(?:\+?\s*6\s*3|0)\s*9(?:[\s\-.,()*#]*\d){9}/g,
  // Any run of 7+ digits, even separated (bank accounts, landlines, GCash numbers)
  /\d(?:[\s\-.,()*#]*\d){6,}/g,
  // Emails, including "at"/"dot" obfuscation
  /[a-z0-9._%+-]+\s*(?:@|\(\s*at\s*\)|\[\s*at\s*\])\s*[a-z0-9-]+(?:\s*(?:\.|\(\s*dot\s*\)|\[\s*dot\s*\])\s*[a-z0-9-]+)+/gi,
  // Messaging deep links
  /\b(?:wa\.me|t\.me|m\.me|fb\.me|fb\.com|facebook\.com|instagram\.com|viber:\/\/)\S*/gi,
  // "viber/telegram/whatsapp/messenger/IG/FB: handle"
  /\b(?:viber|whatsapp|whats\s+app|telegram|wechat|messenger|signal)\b[\s:@/\-]*[a-z0-9._-]{2,}/gi,
];

// Phrases that signal an off-platform move even without a number.
const LEAK_HINTS: RegExp[] = [
  /\b(?:text|txt|tawag(?:an)?|call|contact)\s+(?:mo|nyo|niyo)?\s*(?:ako|me)\b/i,
  /\bpm\s+(?:kita|mo\s+ako|sa\s+fb)\b/i,
  /\b(?:add|search)\s+(?:mo|nyo)?\s*(?:ako|me)\s+(?:sa|on|in)\s+(?:fb|facebook|ig|instagram|viber|messenger|telegram)\b/i,
  /\bcash\s*(?:na\s+lang|nalang)\b.*\b(?:wag|huwag|hindi)\b.*\bapp\b/i,
  /\blabas\s+(?:ng|sa)\s+app\b/i,
  /\bg-?\s?cash\s*(?:ko|number|no\.?|#)\b/i,
];

function maskSpelledNumbers(text: string): { text: string; hit: boolean } {
  const tokens = text.split(/(\s+)/); // keep whitespace tokens
  let run: number[] = []; // indexes of consecutive digit-words
  let hit = false;
  const wordIndexes: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (/^\s+$/.test(tokens[i]) || tokens[i] === "") continue;
    wordIndexes.push(i);
  }
  const flushIfRun = () => {
    if (run.length >= 5) {
      hit = true;
      for (const idx of run) tokens[idx] = MASK;
    }
    run = [];
  };
  for (const idx of wordIndexes) {
    const w = tokens[idx].toLowerCase().replace(/[^a-z]/g, "");
    if (DIGIT_WORDS.has(w)) run.push(idx);
    else flushIfRun();
  }
  flushIfRun();
  return { text: tokens.join(""), hit };
}

export interface MaskResult {
  masked: string;
  flagged: boolean; // true if anything was masked or a leak hint matched
}

export function maskContacts(input: string): MaskResult {
  let flagged = false;
  let text = input;

  for (const re of PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) {
      flagged = true;
      re.lastIndex = 0;
      text = text.replace(re, MASK);
    }
  }

  const spelled = maskSpelledNumbers(text);
  text = spelled.text;
  flagged = flagged || spelled.hit;

  if (!flagged) {
    for (const re of LEAK_HINTS) {
      if (re.test(text)) {
        flagged = true; // hint alone: flag for review but don't rewrite the text
        break;
      }
    }
  }

  return { masked: text, flagged };
}

/** Strikes before an account is queued for admin review. */
export const STRIKE_LIMIT = 3;
