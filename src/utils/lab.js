// Parameter ki normal range patient ke gender ke mutabiq
export const rangeFor = (param, gender) => (gender === "Female" ? param.female : param.male);
export const rangeText = (r) => `${r.min} - ${r.max}`;
export function flagFor(value, range) {
  if (value === "" || value === undefined || Number.isNaN(Number(value))) return "";
  if (Number(value) < range.min) return "Low";
  if (Number(value) > range.max) return "High";
  return "Normal";
}

// Textarea ki har line: name|unit|maleMin-maleMax|femaleMin-femaleMax
export function parseParameters(text) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const [name, unit, male, female] = line.split("|").map((s) => s.trim());
    const [mMin, mMax] = (male || "0-0").split("-").map(Number);
    const [fMin, fMax] = (female || male || "0-0").split("-").map(Number);
    return { name, unit, male: { min: mMin, max: mMax }, female: { min: fMin, max: fMax } };
  });
}
