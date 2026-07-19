"use client";

import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "../../components/ThemeToggle";

type Unidad = "mm" | "cm" | "m";
type CampoEditado = "real" | "modelo";

const unidades: Record<
  Unidad,
  {
    nombre: string;
    milimetros: number;
  }
> = {
  mm: {
    nombre: "Milímetros",
    milimetros: 1,
  },
  cm: {
    nombre: "Centímetros",
    milimetros: 10,
  },
  m: {
    nombre: "Metros",
    milimetros: 1000,
  },
};

function convertirNumero(texto: string) {
  return Number(texto.replace(",", "."));
}

function formatearNumero(numero: number) {
  if (!Number.isFinite(numero)) {
    return "";
  }

  return Number(numero.toFixed(4)).toString();
}

function calcularMedidaModelo(
  medidaReal: string,
  unidadReal: Unidad,
  unidadModelo: Unidad,
  factorInicial: string,
  factorFinal: string
) {
  const valorReal = convertirNumero(medidaReal);
  const inicial = convertirNumero(factorInicial);
  const final = convertirNumero(factorFinal);

  if (
    !Number.isFinite(valorReal) ||
    !Number.isFinite(inicial) ||
    !Number.isFinite(final) ||
    inicial <= 0 ||
    final <= 0
  ) {
    return "";
  }

  const realEnMilimetros =
    valorReal * unidades[unidadReal].milimetros;

  const modeloEnMilimetros =
    realEnMilimetros * (inicial / final);

  return formatearNumero(
    modeloEnMilimetros /
      unidades[unidadModelo].milimetros
  );
}

function calcularMedidaReal(
  medidaModelo: string,
  unidadModelo: Unidad,
  unidadReal: Unidad,
  factorInicial: string,
  factorFinal: string
) {
  const valorModelo = convertirNumero(medidaModelo);
  const inicial = convertirNumero(factorInicial);
  const final = convertirNumero(factorFinal);

  if (
    !Number.isFinite(valorModelo) ||
    !Number.isFinite(inicial) ||
    !Number.isFinite(final) ||
    inicial <= 0 ||
    final <= 0
  ) {
    return "";
  }

  const modeloEnMilimetros =
    valorModelo * unidades[unidadModelo].milimetros;

  const realEnMilimetros =
    modeloEnMilimetros * (final / inicial);

  return formatearNumero(
    realEnMilimetros /
      unidades[unidadReal].milimetros
  );
}

function convertirUnidad(
  valor: string,
  unidadAnterior: Unidad,
  unidadNueva: Unidad
) {
  const numero = convertirNumero(valor);

  if (!Number.isFinite(numero)) {
    return valor;
  }

  const milimetros =
    numero * unidades[unidadAnterior].milimetros;

  return formatearNumero(
    milimetros / unidades[unidadNueva].milimetros
  );
}

export default function EscaladorPage() {
  const [factorInicial, setFactorInicial] =
    useState("1");

  const [factorFinal, setFactorFinal] =
    useState("250");

  const [medidaReal, setMedidaReal] =
    useState("44");

  const [unidadReal, setUnidadReal] =
    useState<Unidad>("m");

  const [medidaModelo, setMedidaModelo] =
    useState("176");

  const [unidadModelo, setUnidadModelo] =
    useState<Unidad>("mm");

  const [campoEditado, setCampoEditado] =
    useState<CampoEditado>("real");

  function actualizarDesdeReal(valor: string) {
    setCampoEditado("real");
    setMedidaReal(valor);

    setMedidaModelo(
      calcularMedidaModelo(
        valor,
        unidadReal,
        unidadModelo,
        factorInicial,
        factorFinal
      )
    );
  }

  function actualizarDesdeModelo(valor: string) {
    setCampoEditado("modelo");
    setMedidaModelo(valor);

    setMedidaReal(
      calcularMedidaReal(
        valor,
        unidadModelo,
        unidadReal,
        factorInicial,
        factorFinal
      )
    );
  }

  function recalcularConEscala(
    nuevoInicial: string,
    nuevoFinal: string
  ) {
    if (campoEditado === "real") {
      setMedidaModelo(
        calcularMedidaModelo(
          medidaReal,
          unidadReal,
          unidadModelo,
          nuevoInicial,
          nuevoFinal
        )
      );
    } else {
      setMedidaReal(
        calcularMedidaReal(
          medidaModelo,
          unidadModelo,
          unidadReal,
          nuevoInicial,
          nuevoFinal
        )
      );
    }
  }

  function cambiarFactorInicial(valor: string) {
    setFactorInicial(valor);
    recalcularConEscala(valor, factorFinal);
  }

  function cambiarFactorFinal(valor: string) {
    setFactorFinal(valor);
    recalcularConEscala(factorInicial, valor);
  }

  function cambiarUnidadReal(
    nuevaUnidad: Unidad
  ) {
    const nuevoValor = convertirUnidad(
      medidaReal,
      unidadReal,
      nuevaUnidad
    );

    setUnidadReal(nuevaUnidad);
    setMedidaReal(nuevoValor);

    setMedidaModelo(
      calcularMedidaModelo(
        nuevoValor,
        nuevaUnidad,
        unidadModelo,
        factorInicial,
        factorFinal
      )
    );
  }

  function cambiarUnidadModelo(
    nuevaUnidad: Unidad
  ) {
    const nuevoValor = convertirUnidad(
      medidaModelo,
      unidadModelo,
      nuevaUnidad
    );

    setUnidadModelo(nuevaUnidad);
    setMedidaModelo(nuevoValor);

    setMedidaReal(
      calcularMedidaReal(
        nuevoValor,
        nuevaUnidad,
        unidadReal,
        factorInicial,
        factorFinal
      )
    );
  }

  const inicial =
    convertirNumero(factorInicial);

  const final =
    convertirNumero(factorFinal);

  const realNumero =
    convertirNumero(medidaReal);

  const modeloNumero =
    convertirNumero(medidaModelo);

  const datosValidos =
    Number.isFinite(inicial) &&
    Number.isFinite(final) &&
    Number.isFinite(realNumero) &&
    Number.isFinite(modeloNumero) &&
    inicial > 0 &&
    final > 0;

  const realEnMilimetros = datosValidos
    ? realNumero *
      unidades[unidadReal].milimetros
    : 0;

  const modeloEnMilimetros = datosValidos
    ? modeloNumero *
      unidades[unidadModelo].milimetros
    : 0;

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-5 py-10 text-[var(--text-main)] transition-colors duration-300">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-bold text-[var(--text-muted)] transition hover:text-red-600"
          >
            ← Volver a Kint 3D
          </Link>

          <ThemeToggle />
        </header>

        <section className="mb-7">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">
            Herramienta de escala
          </p>

          <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] sm:text-4xl">
            Escalador 3D
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            Convertí medidas reales a medidas de
            impresión y comprobá el tamaño correcto
            de tu modelo antes de exportarlo.
          </p>
        </section>

        <section className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--shadow-soft)]">
          <div className="border-b border-[var(--border-color)] p-5 sm:p-6">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Factor de escala
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <input
                value={factorInicial}
                onChange={(evento) =>
                  cambiarFactorInicial(
                    evento.target.value
                  )
                }
                inputMode="decimal"
                aria-label="Primer valor de la escala"
                className="w-20 rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-3 py-2.5 text-center text-base font-black outline-none transition focus:border-red-600"
              />

              <span className="text-2xl font-black">
                :
              </span>

              <input
                value={factorFinal}
                onChange={(evento) =>
                  cambiarFactorFinal(
                    evento.target.value
                  )
                }
                inputMode="decimal"
                aria-label="Segundo valor de la escala"
                className="w-24 rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-3 py-2.5 text-center text-base font-black outline-none transition focus:border-red-600"
              />

              <span className="rounded-full border border-red-600/40 bg-red-600/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-600">
                Escala {factorInicial}:{factorFinal}
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2">
            <div className="border-b border-[var(--border-color)] p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-500">
                Longitud real
              </p>

              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_130px] gap-3">
                <input
                  value={medidaReal}
                  onChange={(evento) =>
                    actualizarDesdeReal(
                      evento.target.value
                    )
                  }
                  inputMode="decimal"
                  aria-label="Longitud real"
                  className="min-w-0 rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-3 text-base font-black outline-none transition focus:border-blue-500"
                />

                <select
                  value={unidadReal}
                  onChange={(evento) =>
                    cambiarUnidadReal(
                      evento.target.value as Unidad
                    )
                  }
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-3 py-3 text-sm font-bold outline-none"
                >
                  {Object.entries(unidades).map(
                    ([clave, unidad]) => (
                      <option
                        key={clave}
                        value={clave}
                      >
                        {unidad.nombre}
                      </option>
                    )
                  )}
                </select>
              </div>

              <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">
                Escribí una medida real conocida del
                proyecto.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
                Longitud en el modelo
              </p>

              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_130px] gap-3">
                <input
                  value={medidaModelo}
                  onChange={(evento) =>
                    actualizarDesdeModelo(
                      evento.target.value
                    )
                  }
                  inputMode="decimal"
                  aria-label="Longitud del modelo"
                  className="min-w-0 rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-3 text-base font-black outline-none transition focus:border-orange-500"
                />

                <select
                  value={unidadModelo}
                  onChange={(evento) =>
                    cambiarUnidadModelo(
                      evento.target.value as Unidad
                    )
                  }
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-3 py-3 text-sm font-bold outline-none"
                >
                  {Object.entries(unidades).map(
                    ([clave, unidad]) => (
                      <option
                        key={clave}
                        value={clave}
                      >
                        {unidad.nombre}
                      </option>
                    )
                  )}
                </select>
              </div>

              <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">
                Esta es la medida que debería tener la
                pieza preparada para imprimir.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
          {datosValidos ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">
                Resultado
              </p>

              <h2 className="mt-3 text-lg font-black sm:text-xl">
                {medidaReal} {unidadReal} reales equivalen
                a{" "}
                <span className="text-emerald-600">
                  {medidaModelo} {unidadModelo}
                </span>{" "}
                en escala {factorInicial}:{factorFinal}.
              </h2>

              <div className="mt-5 space-y-1 rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] p-4 font-mono text-xs leading-6">
                <p>
                  {medidaReal} {unidadReal} ={" "}
                  {formatearNumero(realEnMilimetros)} mm
                </p>

                <p>
                  {formatearNumero(realEnMilimetros)} mm ×{" "}
                  {factorInicial} ÷ {factorFinal} ={" "}
                  {formatearNumero(modeloEnMilimetros)} mm
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm font-semibold text-red-600">
              Completá la escala y las medidas con
              números mayores que cero.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}