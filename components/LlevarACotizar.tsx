"use client";

/*
 * Visor 3D: el botón grande para pedir la impresión. Lleva el archivo a
 * Cotizar ya cargado (reparado si se reparó) y con la escala elegida.
 * Si el cliente vino desde Cotizar, vuelve a esa pestaña sin perder nada.
 */

export default function LlevarACotizar({
  vieneDeCotizar,
  reparado,
  escala,
  llevando,
  onClick,
}: {
  vieneDeCotizar: boolean;
  reparado: boolean;
  escala: string;
  llevando: boolean;
  onClick: () => void;
}) {
  const extras = [reparado && "reparado", escala && `a escala 1:${escala}`].filter(Boolean).join(" y ");
  return (
    <div className="mt-3 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 p-4 text-white shadow-[0_14px_34px_-14px_rgba(220,38,38,0.8)]">
      <p className="text-[13px] font-black leading-5">{vieneDeCotizar ? "¿Todo bien? Seguí con tu pedido" : "¿Te gusta cómo queda? Imprimilo con nosotros"}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={llevando}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3.5 text-left text-[13px] font-black text-red-700 transition hover:scale-[1.02] disabled:opacity-70"
      >
        {llevando ? "Llevándolo…" : vieneDeCotizar ? "Volver a cotizar con este archivo" : "Cotizar este archivo"}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">→</span>
      </button>
      <p className="mt-2 text-[10px] leading-4 text-white/85">
        Te lo llevamos a Cotizar ya cargado{extras ? `, ${extras}` : ""}. Solo completás tus datos.
      </p>
    </div>
  );
}
