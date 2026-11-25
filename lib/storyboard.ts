// Découpe UN prompt en plusieurs plans de 5 s, pour une vidéo longue sans répétition.
// - Reconnaît le dialogue : « … », "…", ou « Monsieur dit : … », « la dame répond … », « Jean : … ».
// - Répartit les répliques entre les clips, dans l'ordre, en gardant qui parle.
// - Chaque clip reçoit une consigne de progression (début, suite, fin) pour que l'action avance.
// Tout se fait sans IA supplémentaire (gratuit et instantané).

export type Turn = { speaker: string; line: string };

const VERBS = [
  "a dit", "a répondu", "a demandé", "dit", "répond", "demande", "ajoute", "crie", "chuchote",
  "murmure", "lance", "déclare", "explique", "annonce", "says", "said", "replies", "replied",
  "asks", "asked", "answers", "answered", "whispers", "shouts", "adds",
];
const VERB_RE = new RegExp(
  `\\b(${VERBS.map((v) => v.replace(" ", "\\s+")).join("|")})\\b((?:\\s+(?:en|in)\\s+[a-zà-ÿ]+)?)\\s*(:)?`,
  "gi"
);
const DETERMINERS = new Set([
  "le", "la", "les", "l'", "l’", "un", "une", "mon", "ma", "son", "sa", "ce", "cette", "monsieur",
  "madame", "mademoiselle", "the", "a", "an", "my", "his", "her", "mr", "mrs", "ms",
]);
const STOP_WORDS = new Set(["et", "puis", "alors", "and", "then", "so", "mais", "but"]);
const QUOTE_OPEN = /^\s*[«"“]\s*/;
const QUOTE_CLOSE = /[»"”]/;

function isFrench(text: string) {
  const t = ` ${text.toLowerCase()} `;
  if (/[«»éèêàùçœ]/.test(t)) return true;
  return [" le ", " la ", " les ", " une ", " des ", " et ", " dans ", " avec ", " dit ", " je ", " tu ", " salut ", " bonjour ", " quoi ", " de ", " pour ", " est "]
    .filter((w) => t.includes(w)).length >= 2;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const words = (u: string) => u.split(/\s+/).filter(Boolean).length;

// Trouve « qui parle » juste avant un verbe ou un « : »
function findSpeaker(text: string, end: number): { speaker: string; start: number } {
  const before = text.slice(0, end);
  const cut = Math.max(...[".", "!", "?", ";", ",", "»", "”", "\n"].map((c) => before.lastIndexOf(c)));
  const segStart = cut + 1;
  const tokens = [...before.slice(segStart).matchAll(/[^\s]+/g)].map((m) => ({ w: m[0], i: segStart + (m.index ?? 0) }));
  // on ignore ce qui précède un "et" / "puis"
  let from = 0;
  tokens.forEach((t, i) => { if (STOP_WORDS.has(t.w.toLowerCase())) from = i + 1; });
  const cand = tokens.slice(from);
  if (!cand.length) return { speaker: "", start: end };
  // on commence au dernier déterminant (« la dame », « l'homme », « monsieur »), sinon le dernier mot
  let k = cand.length - 1;
  for (let i = cand.length - 1; i >= Math.max(0, cand.length - 4); i--) {
    const w = cand[i].w.toLowerCase();
    if (DETERMINERS.has(w) || /^l['’]/.test(w)) { k = i; break; }
  }
  if (cand.length - k > 4) k = cand.length - 3;
  const speaker = cand.slice(k).map((t) => t.w).join(" ").replace(/[:,]$/, "");
  return { speaker, start: cand[k].i };
}

// Sépare la scène et les répliques (qui parle + quoi)
export function parseDialogue(prompt: string): { scene: string; turns: Turn[] } {
  type Marker = { start: number; end: number; speaker: string };
  const markers: Marker[] = [];

  // 1) « X dit : », « X répond », « X a dit en français : »
  for (const m of prompt.matchAll(VERB_RE)) {
    const end = (m.index ?? 0) + m[0].length;
    const after = prompt.slice(end);
    const hasColon = !!m[3];
    const opensQuote = QUOTE_OPEN.test(after);
    // « il dit que… », « il dit à… » : ce n'est pas une réplique
    if (!hasColon && !opensQuote && /^\s*(que|qu['’]|à|a\b|that|to\b|non\b|oui\b)/i.test(after)) continue;
    if (!hasColon && !opensQuote && !/^\s*[A-Za-zÀ-ÿ]/.test(after)) continue;
    const { speaker, start } = findSpeaker(prompt, m.index ?? 0);
    markers.push({ start, end, speaker });
  }
  // 2) « Jean : bonjour » (nom court suivi de deux-points, sans verbe)
  for (const m of prompt.matchAll(/:/g)) {
    const pos = m.index ?? 0;
    if (markers.some((k) => pos >= k.start && pos < k.end)) continue;
    if (/\d/.test(prompt[pos - 1] ?? "") || /\d/.test(prompt[pos + 1] ?? "")) continue; // 9:16, 10:30…
    const { speaker, start } = findSpeaker(prompt, pos);
    if (!speaker || words(speaker) > 3 || /\d/.test(speaker)) continue;
    if (/^(format|style|ambiance|lumi[eè]re|cam[ée]ra|camera|lighting|mood|note|ratio)$/i.test(speaker)) continue;
    markers.push({ start, end: pos + 1, speaker });
  }
  markers.sort((a, b) => a.start - b.start);

  // Pas de « qui parle » : on prend seulement les textes entre guillemets
  if (!markers.length) {
    const turns: Turn[] = [];
    const scene = prompt.replace(/«\s*([^»]+?)\s*»|“([^”]+)”|"([^"]+)"/g, (_m, a, b, c) => {
      turns.push({ speaker: "", line: String(a ?? b ?? c).trim() });
      return "";
    });
    return { scene: tidy(scene), turns };
  }

  const turns: Turn[] = [];
  let scene = prompt.slice(0, markers[0].start);
  // « Elle regarde la caméra et dit : … » -> la scène garde « … et parle. » et c'est « Elle » qui parle
  markers.forEach((mk) => {
    if (mk.speaker) return;
    const sentence = prompt.slice(0, mk.start).split(/[.!?]\s+/).pop() ?? "";
    const subject = sentence.trim().split(/\s+/)[0] ?? "";
    if (/^(elle|il|she|he|they|ils|elles)$/i.test(subject)) mk.speaker = subject;
  });
  if (/\b(et|and)\s*$/i.test(scene)) {
    scene = scene.replace(/\b(et)\s*$/i, "et parle. ").replace(/\b(and)\s*$/i, "and speaks. ");
  }

  markers.forEach((mk, i) => {
    const next = markers[i + 1]?.start ?? prompt.length;
    let speech = prompt.slice(mk.end, next);
    let tail = "";
    if (QUOTE_OPEN.test(speech)) {
      speech = speech.replace(QUOTE_OPEN, "");
      const close = speech.search(QUOTE_CLOSE);
      if (close >= 0) { tail = speech.slice(close + 1); speech = speech.slice(0, close); }
    }
    speech = speech.replace(/^[\s:,]+|[\s,]+$/g, "").replace(/\s+(et|puis|and|then)$/i, "");
    if (speech) turns.push({ speaker: mk.speaker, line: speech });
    // ce qui suit une réplique entre guillemets redevient de la description de scène
    const cleanTail = tail.replace(/^[\s,.;]+/, "").replace(/\s*\b(et|puis|and|then)\s*$/i, "").trim();
    if (cleanTail && !STOP_WORDS.has(cleanTail.toLowerCase())) scene += " " + cleanTail;
  });
  return { scene: tidy(scene), turns };
}

function tidy(s: string) {
  return s.replace(/\s{2,}/g, " ").replace(/\s+([.,!?])/g, "$1").replace(/([.,])\s*\./g, "$1").replace(/^[\s,.]+/, "").trim();
}

// Répartit les répliques en n plans équilibrés (en nombre de mots), dans l'ordre.
// Une réplique longue est coupée aux phrases. Si c'est court, les derniers plans sont muets.
export function distributeTurns(turns: Turn[], n: number): Turn[][] {
  if (!turns.length) return Array.from({ length: n }, () => []);
  const WORDS_PER_CLIP = 10; // environ ce qu'on peut dire en 5 secondes
  const total = turns.reduce((s, t) => s + words(t.line), 0);
  const k = Math.min(n, Math.max(Math.ceil(total / WORDS_PER_CLIP), turns.length));
  const target = Math.max(WORDS_PER_CLIP, total / k);
  const units: Turn[] = turns.flatMap((t) => {
    if (words(t.line) <= target * 1.3) return [t];
    let parts = (t.line.match(/[^.!?…]+[.!?…]*/g) ?? [t.line]).map((s) => s.trim()).filter(Boolean)
      .flatMap((s) => (words(s) > target * 1.3 ? s.split(/(?<=,)\s+/) : [s]));
    parts = parts.flatMap((s) => {
      if (words(s) <= target * 1.3) return [s];
      const w = s.split(/\s+/);
      const p = Math.ceil(w.length / target);
      const size = Math.ceil(w.length / p);
      return Array.from({ length: p }, (_, i) => w.slice(i * size, (i + 1) * size).join(" "));
    });
    return parts.map((line) => ({ speaker: t.speaker, line }));
  });

  // découpage optimal : k groupes consécutifs dont le plus long est le plus court possible
  const m = units.length;
  const groups = Math.min(k, m);
  const pre = [0];
  units.forEach((u) => pre.push(pre[pre.length - 1] + words(u.line)));
  const cost = Array.from({ length: groups + 1 }, () => Array(m + 1).fill(Infinity));
  const cut = Array.from({ length: groups + 1 }, () => Array(m + 1).fill(0));
  cost[0][0] = 0;
  for (let g = 1; g <= groups; g++)
    for (let i = g; i <= m; i++)
      for (let j = g - 1; j < i; j++) {
        const c = Math.max(cost[g - 1][j], pre[i] - pre[j]);
        if (c < cost[g][i]) { cost[g][i] = c; cut[g][i] = j; }
      }
  const out: Turn[][] = [];
  let end = m;
  for (let g = groups; g >= 1; g--) { const s = cut[g][end]; out.unshift(units.slice(s, end)); end = s; }
  while (out.length < n) out.push([]);
  return out;
}

// Ancienne fonction gardée pour compatibilité : découpe un texte en n morceaux
export function chunkSpeech(text: string, n: number): string[] {
  return distributeTurns([{ speaker: "", line: text }], n).map((g) => g.map((t) => t.line).join(" "));
}

function renderTurns(turns: Turn[], fr: boolean) {
  // fusionne les morceaux consécutifs d'une même personne
  const merged: Turn[] = [];
  for (const t of turns) {
    const prev = merged[merged.length - 1];
    if (prev && prev.speaker === t.speaker) prev.line = `${prev.line} ${t.line}`;
    else merged.push({ ...t });
  }
  return merged.map((t, i) => {
    const who = t.speaker || (fr ? "le personnage" : "the character");
    const verb = fr ? (i === 0 ? "dit" : "répond") : i === 0 ? "says" : "replies";
    const sentence = fr ? `${who} ${verb} : « ${t.line} »` : `${who} ${verb}: "${t.line}"`;
    return cap(sentence);
  }).join(fr ? " Puis " : " Then ");
}

// ---------- Étapes dans le temps : « D'abord… », « Ensuite… », « À la fin… » ----------
const START_RE = /^(start(s|ing)?\s+(with|on|by)|begin(s|ning)?\s+(with|on|by)|open(s|ing)?\s+(with|on)|first(ly)?\b|at\s+first|au\s+d[ée]but|d['’]abord|pour\s+commencer|on\s+commence|commence[rz]?\s+(par|avec|sur)|ça\s+commence|premi[eè]rement)/i;
const THEN_RE = /^(then|next|after\s+that|afterwards|later|meanwhile|ensuite|puis|apr[eè]s|plus\s+tard|pendant\s+ce\s+temps|soudain|suddenly)\b/i;
const END_RE = /^(end(s|ing)?\s+(with|on|by)|finish(es|ing)?\s+(with|on|by)|finally|at\s+the\s+end|in\s+the\s+end|à\s+la\s+fin|pour\s+finir|pour\s+terminer|enfin|finalement|termine[rz]?\s+(par|avec|sur)|ça\s+se\s+termine|la\s+vid[ée]o\s+se\s+termine)/i;
const META_RE = /\b(create|make|generate|cr[ée]e[rz]?|fais|faire|g[ée]n[èe]re[rz]?)\s+(a|an|une?)\s+\d+\s*-?\s*(seconds?|sec|s|secondes?)\b[^.]*?(video|vid[ée]o)?\s*(of|de|sur|about)?\s*/i;
const DURATION_RE = /\b\d+\s*-?\s*(seconds?|secondes?|sec)\b(\s+long)?/gi;

export type Beats = { global: string; start: string[]; middle: string[]; end: string[] };

// Sépare ce qui vaut pour toute la vidéo et ce qui arrive au début / ensuite / à la fin
export function parseBeats(scene: string): Beats {
  const cleaned = scene.replace(META_RE, "").replace(DURATION_RE, "")
    .replace(/,?\s*\b(in\s+|en\s+|au\s+)?(vertical|horizontal|portrait|landscape|paysage|carr[ée]|square)?\s*\(?\d{1,2}\s*[:/x]\s*\d{1,2}\)?\s*(format|aspect\s+ratio)?/gi, "")
    .replace(/,?\s*\b(vertical|horizontal)\s+(format|video|vid[ée]o)\b/gi, "")
    .replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").replace(/,\s*\./g, ".").trim();
  const sentences = (cleaned.match(/[^.!?]+[.!?]*/g) ?? []).map((x) => x.trim()).filter(Boolean);
  const out: Beats = { global: "", start: [], middle: [], end: [] };
  const global: string[] = [];
  for (const sRaw of sentences) {
    const sTrim = sRaw.replace(/^(and|et)\s+/i, "");
    if (END_RE.test(sTrim)) out.end.push(sTrim);
    else if (START_RE.test(sTrim)) out.start.push(sTrim);
    else if (THEN_RE.test(sTrim)) out.middle.push(sTrim);
    else global.push(sRaw);
  }
  out.global = global.join(" ");
  return out;
}

// Format demandé dans le texte (« vertical », « 9:16 »…)
export function detectAspect(prompt: string): "9:16" | "16:9" | "1:1" | null {
  const p = prompt.toLowerCase();
  if (/9\s*[:/x]\s*16|vertical|portrait|tiktok|reels?\b|shorts?\b/.test(p)) return "9:16";
  if (/1\s*[:/x]\s*1|carr[ée]|square/.test(p)) return "1:1";
  if (/16\s*[:/x]\s*9|horizontal|paysage|landscape|widescreen|youtube/.test(p)) return "16:9";
  return null;
}

export type ClipPlan = { index: number; from: number; to: number; beat: string; turns: Turn[] };

// Plan complet : ce qui se passe dans chaque clip de 5 s
export function planClips(prompt: string, total: number): { plans: ClipPlan[]; scene: string; fr: boolean } {
  const fr = isFrench(prompt);
  const { scene, turns } = parseDialogue(prompt);
  const beats = parseBeats(scene);
  const dialogue = distributeTurns(turns, total);
  const plans: ClipPlan[] = Array.from({ length: total }, (_, i) => ({
    index: i + 1, from: i * 5, to: (i + 1) * 5, beat: "", turns: dialogue[i] ?? [],
  }));
  const global = cap(beats.global);
  if (total === 1) {
    plans[0].beat = [...beats.start, ...beats.middle, ...beats.end].join(" ");
    return { plans, scene: global, fr };
  }
  const last = total - 1;
  plans[0].beat = beats.start.join(" ");
  plans[last].beat = beats.end.join(" ");
  // les étapes « ensuite » se répartissent sur les clips du milieu (ou le premier s'il n'y a que 2 clips)
  const middleSlots = total > 2 ? Array.from({ length: total - 2 }, (_, i) => i + 1) : [0];
  beats.middle.forEach((b, i) => {
    const slot = middleSlots[Math.min(middleSlots.length - 1, Math.floor((i * middleSlots.length) / beats.middle.length))];
    plans[slot].beat = [plans[slot].beat, b].filter(Boolean).join(" ");
  });
  return { plans, scene: global, fr };
}

// Prompt du clip numéro `index` (1..total)
export function clipPrompt(prompt: string, index: number, total: number): string {
  const { plans, scene, fr } = planClips(prompt, total);
  const plan = plans[index - 1] ?? plans[plans.length - 1];
  const hasDialogue = plans.some((p) => p.turns.length);
  if (total <= 1) {
    return [scene, plan.beat, plan.turns.length ? (fr ? "" : "") + renderTurns(plan.turns, fr) : ""].filter(Boolean).join(" ") || prompt;
  }
  const last = index === total;

  const stage = fr
    ? index === 1
      ? `Début de la scène (plan 1 sur ${total}) : on découvre le lieu et les personnages.`
      : last
        ? `Fin de la scène (plan ${index} sur ${total}) : suite directe du plan précédent, l'action se termine naturellement. Mêmes personnages, mêmes tenues, même lieu.`
        : `Suite directe du plan précédent (plan ${index} sur ${total}) : l'action avance, sans recommencer ni répéter ce qui vient de se passer. Mêmes personnages, mêmes tenues, même lieu.`
    : index === 1
      ? `Opening of the scene (shot 1 of ${total}): we discover the place and the characters.`
      : last
        ? `End of the scene (shot ${index} of ${total}): direct continuation of the previous shot, the action ends naturally. Same characters, same outfits, same place.`
        : `Direct continuation of the previous shot (shot ${index} of ${total}): the action moves forward, without restarting or repeating what just happened. Same characters, same outfits, same place.`;

  const endPlanned = !!plans[plans.length - 1].beat;
  const beat = plan.beat
    ? (fr ? `Dans ce plan, il se passe ceci : ${plan.beat}` : `In this shot, this happens: ${plan.beat}`)
    : "";
  const notYet = !last && endPlanned
    ? (fr ? "Ce qui est prévu pour la fin de la vidéo n'arrive pas encore dans ce plan." : "What is planned for the end of the video does not happen yet in this shot.")
    : "";
  const speech = hasDialogue
    ? plan.turns.length
      ? (fr ? "Dans ce plan uniquement : " : "In this shot only: ") + renderTurns(plan.turns, fr)
      : fr ? "Dans ce plan, personne ne parle." : "In this shot, nobody speaks."
    : "";
  return [stage, scene, beat, notYet, speech].filter(Boolean).join(" ");
}

// Alias gardé pour compatibilité
export function splitDialogue(prompt: string) {
  const { scene, turns } = parseDialogue(prompt);
  return { scene, dialogue: turns.map((t) => t.line).join(" ") };
}
