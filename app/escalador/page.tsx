"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "../../components/ThemeToggle";

type Unidad = "mm" | "cm" | "m";
type CampoEditado = "real" | "modelo";

const STORAGE_KEY = "kint3d-escalador-v1";

type DatosEscaladorGuardados = {
  version: 1;
  factorInicial: string;
  factorFinal: string;
  medidaReal: string;
  unidadReal: Unidad;
  medidaModelo: string;
  unidadModelo: Unidad;
  campoEditado: CampoEditado;
  boquillaImprimibilidad: "" | "0.2" | "0.4";
};

function esUnidad(valor: unknown): valor is Unidad {
  return valor === "mm" || valor === "cm" || valor === "m";
}

function esCampoEditado(valor: unknown): valor is CampoEditado {
  return valor === "real" || valor === "modelo";
}

function esBoquilla(
  valor: unknown
): valor is "" | "0.2" | "0.4" {
  return valor === "" || valor === "0.2" || valor === "0.4";
}

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
    valorReal <= 0 ||
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
    valorModelo <= 0 ||
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
  if (!valor.trim()) {
    return "";
  }

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
  const [factorInicial] =
  useState("1");

  const [factorFinal, setFactorFinal] =
    useState("");

  const [medidaReal, setMedidaReal] =
    useState("");

  const [unidadReal, setUnidadReal] =
    useState<Unidad>("m");

  const [medidaModelo, setMedidaModelo] =
    useState("");

  const [unidadModelo, setUnidadModelo] =
    useState<Unidad>("mm");

  const [campoEditado, setCampoEditado] =
    useState<CampoEditado>("real");

  const [boquillaImprimibilidad, setBoquillaImprimibilidad] =
    useState<"" | "0.2" | "0.4">("");

  const [cargadoDesdeStorage, setCargadoDesdeStorage] =
    useState(false);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(STORAGE_KEY);

      if (!guardado) {
        return;
      }

      const datos = JSON.parse(guardado) as Partial<DatosEscaladorGuardados>;

      setFactorFinal(
        typeof datos.factorFinal === "string"
          ? datos.factorFinal.replace(/\D/g, "")
          : ""
      );

      setMedidaReal(
        typeof datos.medidaReal === "string"
          ? datos.medidaReal.replace(/[^0-9.,]/g, "")
          : ""
      );

      if (esUnidad(datos.unidadReal)) {
        setUnidadReal(datos.unidadReal);
      }

      setMedidaModelo(
        typeof datos.medidaModelo === "string"
          ? datos.medidaModelo.replace(/[^0-9.,]/g, "")
          : ""
      );

      if (esUnidad(datos.unidadModelo)) {
        setUnidadModelo(datos.unidadModelo);
      }

      if (esCampoEditado(datos.campoEditado)) {
        setCampoEditado(datos.campoEditado);
      }

      if (esBoquilla(datos.boquillaImprimibilidad)) {
        setBoquillaImprimibilidad(datos.boquillaImprimibilidad);
      }
    } catch (error) {
      console.error(
        "No se pudieron recuperar los datos guardados del escalador:",
        error
      );

      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setCargadoDesdeStorage(true);
    }
  }, []);

  const hayDatosParaGuardar = Boolean(
  factorFinal ||
    medidaReal ||
    medidaModelo ||
    boquillaImprimibilidad
);

  useEffect(() => {
    if (!cargadoDesdeStorage) {
      return;
    }

    if (!hayDatosParaGuardar) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const datos: DatosEscaladorGuardados = {
      version: 1,
      factorInicial,
      factorFinal,
      medidaReal,
      unidadReal,
      medidaModelo,
      unidadModelo,
      campoEditado,
      boquillaImprimibilidad,
    };

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(datos)
      );
    } catch (error) {
      console.error(
        "No se pudieron guardar los datos del escalador:",
        error
      );
    }
  }, [
    cargadoDesdeStorage,
    hayDatosParaGuardar,
    factorInicial,
    factorFinal,
    medidaReal,
    unidadReal,
    medidaModelo,
    unidadModelo,
    campoEditado,
    boquillaImprimibilidad,
  ]);

function borrarDatosGuardados() {
  window.localStorage.removeItem(STORAGE_KEY);

  setFactorFinal("");
  setMedidaReal("");
  setUnidadReal("m");
  setMedidaModelo("");
  setUnidadModelo("mm");
  setCampoEditado("real");
  setBoquillaImprimibilidad("");
}

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
    final > 0 &&
    realNumero > 0 &&
    modeloNumero > 0;

  const realEnMilimetros = datosValidos
    ? realNumero *
      unidades[unidadReal].milimetros
    : 0;

  const modeloEnMilimetros = datosValidos
    ? modeloNumero *
      unidades[unidadModelo].milimetros
    : 0;

const escalaValida =
  Number.isFinite(inicial) &&
  Number.isFinite(final) &&
  inicial > 0 &&
  final > 0;

const boquillaMm =
  boquillaImprimibilidad
    ? Number(boquillaImprimibilidad)
    : null;

const minimoRealMm =
  escalaValida && boquillaMm !== null
    ? boquillaMm * (final / inicial)
    : null;

const minimoRealCm =
  minimoRealMm !== null
    ? minimoRealMm / 10
    : null;

const margenImprimibilidad =
  datosValidos && boquillaMm !== null
    ? modeloEnMilimetros - boquillaMm
    : null;

const estadoImprimibilidad =
  !datosValidos || boquillaMm === null
    ? null
    : modeloEnMilimetros < boquillaMm
    ? "no"
    : modeloEnMilimetros < boquillaMm * 1.25
    ? "justo"
    : "si";

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-5 py-10 text-[var(--text-main)] transition-colors duration-300">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex justify-end">
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Factor de escala
              </p>

              <div className="flex items-center gap-2">
                {cargadoDesdeStorage && hayDatosParaGuardar && (
                  <span className="hidden text-[10px] font-semibold text-emerald-600 sm:inline">
                    Guardado automático
                  </span>
                )}

                <button
                  type="button"
                  onClick={borrarDatosGuardados}
                  title="Borrar datos guardados"
                  aria-label="Borrar datos guardados del escalador"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] text-sm opacity-55 transition hover:border-red-600 hover:bg-red-600/10 hover:opacity-100"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="w-10 text-center text-base font-black text-[var(--text-main)]">
  1
</span>

              <span className="text-2xl font-black">
                :
              </span>

              <input
                value={factorFinal}
                placeholder="250"
                onChange={(evento) =>
  cambiarFactorFinal(
    evento.target.value.replace(/\D/g, "")
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
                  placeholder="Ej: 50"
                  onChange={(evento) =>
  actualizarDesdeReal(
    evento.target.value.replace(
      /[^0-9.,]/g,
      ""
    )
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
                  placeholder="Se calcula solo"
                  onChange={(evento) =>
                    actualizarDesdeModelo(
                      evento.target.value.replace(
                        /[^0-9.,]/g,
                        ""
                      )
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

          <div className="border-t border-[var(--border-color)] p-5 sm:p-6">
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
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-600">
            Imprimibilidad
          </p>

          <div className="mt-4 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-main)]">
                Seleccionar boquilla
              </label>

              <p className="mb-3 text-xs leading-5 text-[var(--text-muted)]">
                Elegí el diámetro con el que querés comprobar la pieza.
                0,2 mm prioriza el detalle y 0,4 mm es una opción más general.
              </p>

              <select
                value={boquillaImprimibilidad}
                onChange={(e) =>
                  setBoquillaImprimibilidad(
                    e.target.value as "" | "0.2" | "0.4"
                  )
                }
                className={`w-full rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-3 text-sm font-bold outline-none ${
                  boquillaImprimibilidad === ""
                    ? "text-red-600"
                    : "text-[var(--text-main)]"
                }`}
              >
                <option value="" disabled>
                  Seleccionar boquilla
                </option>

                <option value="0.2">
                  0,2 mm — Máximo detalle
                </option>

                <option value="0.4">
                  0,4 mm — Mejor equilibrio
                </option>
              </select>
            </div>

            <div>
              {boquillaMm === null ? (
                <div className="rounded-xl border border-dashed border-[var(--border-color)] p-4">
                  <p className="text-sm font-semibold text-[var(--text-main)]">
                    Elegí una boquilla para calcular el grosor mínimo imprimible.
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Usaremos automáticamente la escala y las medidas que cargaste arriba.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Espesor mínimo en tu modelo real
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                        El elemento debería tener al menos este grosor antes de escalarlo.
                        Con esta boquilla, equivale a {boquillaMm
                          .toFixed(1)
                          .replace(".", ",")} mm en la impresión.
                      </p>
                    </div>

                    <strong className="text-xl text-[var(--text-main)]">
                      {minimoRealCm !== null
                        ? formatearNumero(minimoRealCm)
                        : "-"}{" "}
                      cm
                    </strong>
                  </div>

                  {estadoImprimibilidad && (
                <div className="mt-4">
                  <p
                    className={`font-black ${
                      estadoImprimibilidad === "si"
                        ? "text-emerald-600"
                        : estadoImprimibilidad === "justo"
                        ? "text-amber-500"
                        : "text-red-600"
                    }`}
                  >
                    {estadoImprimibilidad === "si"
                      ? "✓ SE PUEDE IMPRIMIR"
                      : estadoImprimibilidad === "justo"
                      ? "⚠ SE IMPRIME, PERO ES MUY FINO"
                      : "✕ NO SE RECOMIENDA IMPRIMIR"}
                  </p>

                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Con los datos de arriba, esta medida queda en{" "}
                    <strong className="text-[var(--text-main)]">
                      {formatearNumero(modeloEnMilimetros)} mm
                    </strong>{" "}
                    una vez impresa.
                  </p>

                  {estadoImprimibilidad === "no" && (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      Para esta escala debería medir al menos{" "}
                      {minimoRealCm !== null
                        ? formatearNumero(minimoRealCm)
                        : "-"}{" "}
                      cm en la medida real.
                    </p>
                  )}

                  {estadoImprimibilidad !== "no" &&
                    margenImprimibilidad !== null && (
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        Margen sobre el mínimo: +
                        {formatearNumero(
                          margenImprimibilidad
                        )}{" "}
                        mm
                      </p>
                    )}
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </section>



      </div>
    </main>
  );
}