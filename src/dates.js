// Dates : le site écrit des dates ISO, mais une date tapée à la main dans Google Sheets
// arrive sous forme de nombre (jours depuis le 30/12/1899). On gère les deux.
function versDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400 * 1000));
  const s = String(v).trim();
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // 31/10/2026
  if (fr) return new Date(Date.UTC(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1])));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const horodatage = (v) => { const d = versDate(v); return d ? d.getTime() : 0; };

// Format court en français, heure du Gabon : 18/10/2026
function dateCourte(v) {
  const d = versDate(v);
  if (!d) return String(v || '');
  return d.toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville', day: '2-digit', month: '2-digit', year: 'numeric' });
}

module.exports = { versDate, horodatage, dateCourte };
