// Cálculo de nascer/pôr do sol e crepúsculo civil — algoritmo NOAA simplificado.
// Uso em edge function (Deno) e frontend. Sem dependências externas.

export interface SolarEvents {
  nascer_sol: Date | null;
  por_sol: Date | null;
  crepusculo_civil_inicio: Date | null;
  crepusculo_civil_fim: Date | null;
  fotoperiodo_min: number | null;
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function toJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function fromJulian(j: number): Date {
  return new Date((j - 2440587.5) * 86400000);
}

/**
 * Calcula eventos solares para uma data UTC, latitude e longitude.
 * Retorna timestamps UTC (Date).
 *
 * @param date  Data alvo (qualquer hora; usa o "dia" UTC)
 * @param lat   Latitude em graus (sul negativo)
 * @param lon   Longitude em graus (oeste negativo)
 */
export function calcularSolar(date: Date, lat: number, lon: number): SolarEvents {
  // dia juliano para meio-dia local aproximado
  const d0 = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
  const J = toJulian(d0);
  const n = J - 2451545.0 + 0.0008;
  const Jstar = n - lon / 360;
  const M = (357.5291 + 0.98560028 * Jstar) % 360;
  const Mrad = M * RAD;
  const C = 1.9148 * Math.sin(Mrad) + 0.0200 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const lambdaRad = lambda * RAD;
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);
  const delta = Math.asin(Math.sin(lambdaRad) * Math.sin(23.44 * RAD));

  function eventForAltitude(altDeg: number): { rise: Date | null; set: Date | null } {
    const cosH = (Math.sin(altDeg * RAD) - Math.sin(lat * RAD) * Math.sin(delta)) /
                 (Math.cos(lat * RAD) * Math.cos(delta));
    if (cosH > 1) return { rise: null, set: null }; // sol nunca nasce
    if (cosH < -1) return { rise: null, set: null }; // sol nunca se põe
    const H = Math.acos(cosH) * DEG;
    const Jset = 2451545.0 + (Jstar + H / 360) + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);
    const Jrise = Jtransit - (Jset - Jtransit);
    return { rise: fromJulian(Jrise), set: fromJulian(Jset) };
  }

  const sol = eventForAltitude(-0.833);
  const civ = eventForAltitude(-6);

  const fotoperiodo_min = sol.rise && sol.set
    ? Math.round((sol.set.getTime() - sol.rise.getTime()) / 60000)
    : null;

  return {
    nascer_sol: sol.rise,
    por_sol: sol.set,
    crepusculo_civil_inicio: civ.rise,
    crepusculo_civil_fim: civ.set,
    fotoperiodo_min,
  };
}
