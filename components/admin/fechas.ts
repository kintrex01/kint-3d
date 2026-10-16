/*
 * Fechas del panel en hora de Montevideo, como "yyyy-mm-dd",
 * sin depender de la zona horaria del navegador.
 */

import { useSyncExternalStore } from "react";

export const ZONA_KINT = "America/Montevideo";

export const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const DIAS_LARGOS = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];

const formatoMontevideo = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_KINT,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

/* "yyyy-mm-dd|HH" de ahora en Montevideo. */
function instanteMontevideo() {
  const partes = Object.fromEntries(
    formatoMontevideo
      .formatToParts(new Date())
      .map((parte) => [parte.type, parte.value])
  );
  return `${partes.year}-${partes.month}-${partes.day}|${partes.hour}`;
}

function suscribirReloj(avisar: () => void) {
  const intervalo = window.setInterval(avisar, 60000);
  document.addEventListener("visibilitychange", avisar);
  return () => {
    window.clearInterval(intervalo);
    document.removeEventListener("visibilitychange", avisar);
  };
}

/*
 * Hoy y la hora en Montevideo. En el servidor devuelve null para que
 * el HTML inicial no dependa de la hora (evita errores de hidratación).
 */
export function useHoyMontevideo() {
  const instante = useSyncExternalStore(
    suscribirReloj,
    instanteMontevideo,
    () => ""
  );
  if (!instante) return null;
  const [hoy, hora] = instante.split("|");
  return { hoy, hora: Number(hora) };
}

export function aISO(anio: number, mes: number, dia: number) {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(
    2,
    "0"
  )}`;
}

/* mes de 0 a 11, como Date. */
export function partesISO(iso: string) {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return { anio, mes: mes - 1, dia };
}

export function sumarDias(iso: string, dias: number) {
  const { anio, mes, dia } = partesISO(iso);
  const fecha = new Date(Date.UTC(anio, mes, dia + dias));
  return aISO(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
}

/* 0 = domingo … 6 = sábado. */
export function diaSemana(iso: string) {
  const { anio, mes, dia } = partesISO(iso);
  return new Date(Date.UTC(anio, mes, dia)).getUTCDay();
}

export function esFinDeSemana(iso: string) {
  const semana = diaSemana(iso);
  return semana === 0 || semana === 6;
}

/* "jueves 15 de octubre". */
export function fechaLarga(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || "")) return "";
  const { mes, dia } = partesISO(iso.slice(0, 10));
  return `${DIAS_LARGOS[diaSemana(iso.slice(0, 10))]} ${dia} de ${
    MESES_LARGOS[mes]
  }`;
}

/* Normaliza lo que venga de la hoja a "yyyy-mm-dd" (o ""). */
export function soloDia(valor: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || "");
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}
