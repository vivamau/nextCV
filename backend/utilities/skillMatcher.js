/**
 * Bidirectional skill matching logic.
 * Matches if torSkill is in candSkill or vice-versa.
 * Uses substring match for length >= 3, and word boundaries for shorter strings.
 */
function getSkillOverlap(candidateSkills, torSkills) {
  if (!candidateSkills || !torSkills || !candidateSkills.length || !torSkills.length) {
    return [];
  }

  const normalizedCandSkills = candidateSkills.map(s => s.toLowerCase().trim());
  const normalizedTorSkills = torSkills.map(s => s.toLowerCase().trim());
  const matches = new Set();

  function isMatch(short, long) {
    if (short === long) return true;
    if (short.length < 1) return false;
    
    // If it's not a substring, definitely no match
    if (!long.includes(short)) return false;

    // If it's a substring and length is >= 3, we count it (e.g. 'React' in 'React.js')
    if (short.length >= 3) return true;

    // If it's a short substring (1-2 chars), check for word boundaries
    // to avoid 'C' matching 'CSS', but allow 'R' matching 'R Language'
    const escaped = short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|\\/|\\-|\\,|\\.|\\+)${escaped}($|\\s|\\/|\\-|\\,|\\.|\\+)`, 'i');
    return regex.test(long);
  }

  for (const t of normalizedTorSkills) {
    let matched = false;
    for (const c of normalizedCandSkills) {
      if (isMatch(t, c) || isMatch(c, t)) {
        matched = true;
        break; 
      }
    }
    if (matched) matches.add(t);
  }

  // Map back to original TOR skill casing
  return Array.from(matches).map(m => {
    const original = torSkills.find(ts => ts.toLowerCase().trim() === m);
    return original || m;
  });
}

module.exports = { getSkillOverlap };
