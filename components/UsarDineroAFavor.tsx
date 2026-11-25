"use client";

import { useEffect, useState } from "react";
import { HandCoins, LoaderCircle } from "lucide-react";

/*
 * Seguimiento, al pagar: «Tenés $X de dinero a favor. ¿Querés usarlo?».
 * Si lo usa, se descuenta del precio (o del saldo, si ya pagó la seña); lo puede sacar
 * mientras no mande el comprobante. Lo calcula Apps Script (DineroAFavor_Kint3D.js).
 */

type Estado = { saldo: number; usado: number; puedeUsar: boolean; puedeQuitar: boolean };

function pesos(valor: number) {
  return `$${Number(valor || 0).toLocaleString("es-UY")}`;
}

async function pedir(accion: "ver" | "usar" | "quitar", pedido: string, codigo: string) {
  const respuesta = await fetch("/api/dinero-favor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion, pedido, codigo }),
  });
  const data = await respuesta.json();
  if (!data?.ok) throw new Error(data?.error || "No se pudo.");
  return data;
}

export default function UsarDineroAFavor({ pedido, codigo, onCambio }: { pedido: string; codigo: string; onCambio: () => void }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    pedir("ver", pedido, codigo)
      .then((data) => activo && setEstado(data))
      .catch(() => activo && setEstado(null));
    return () => {
      activo = false;
    };
  }, [pedido, codigo, version]);

  if (!estado || (!(estado.saldo > 0) && !(estado.usado > 0))) return null;
  if (!estado.usado && !estado.puedeUsar) return null;

  async function hacer(accion: "usar" | "quitar") {
    setOcupado(true);
    setError("");
    try {
      const data = await pedir(accion, pedido, codigo);
      setMensaje(data.mensaje || "");
      setVersion((actual) => actual + 1);
      onCambio();
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mb-5 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 p-4 text-left">
      <p className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300">
        <HandCoins size={18} />
        {estado.usado > 0 ? `Usaste ${pesos(estado.usado)} de tu dinero a favor` : `Tenés ${pesos(estado.saldo)} de dinero a favor`}
      </p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {estado.usado > 0
          ? `Ya está descontado de lo que tenés que pagar.${estado.saldo > 0 ? ` Te quedan ${pesos(estado.saldo)} a favor.` : ""}`
          : "¿Querés usarlo en este pedido? Se descuenta de lo que tenés que pagar."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!estado.usado && estado.puedeUsar && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void hacer("usar")}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {ocupado && <LoaderCircle size={15} className="animate-spin" />}
            Sí, usarlo
          </button>
        )}
        {estado.usado > 0 && estado.puedeQuitar && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void hacer("quitar")}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 text-sm font-bold transition hover:border-red-500 disabled:opacity-50"
          >
            {ocupado && <LoaderCircle size={15} className="animate-spin" />}
            No, guardarlo para después
          </button>
        )}
      </div>
      {mensaje && <p className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">{mensaje}</p>}
      {error && <p className="mt-2 text-sm font-bold text-red-600">{error}</p>}
    </div>
  );
}
