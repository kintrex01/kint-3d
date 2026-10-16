"use client";

import { useMemo, useState } from "react";
import { MessageSquareText, RefreshCw, Search, X, Zap } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { FilaConfig } from "@/lib/admin-tipos";
import {
  Boton,
  CajaError,
  DialogoConfirmar,
  Encabezado,
  Esqueleto,
  Interruptor,
  Tarjeta,
  TituloSeccion,
  Vacio,
  claseInput,
  useAvisos,
} from "@/components/admin/ui";

/* ------------------------------------------------------------------ */
/* Textos                                                              */
/* ------------------------------------------------------------------ */

const DESCRIPCIONES: Record<string, string> = {
  aceptar_pedidos: "Si está apagado, /cotizar no recibe pedidos nuevos",
  estado_pagina: "Si está apagado, /cotizar muestra «Cotizaciones pausadas»",
  mostrar_aviso_emergente:
    "Muestra un aviso emergente en toda la web con el mensaje",
  fecha_reapertura: "Fecha que se anuncia en el aviso y en la pausa",
  pedido_urgente: "Ofrece la opción de pedido urgente en /cotizar",
  pedido_urgente_valor: "Recargo en % (escribí 20, no 0,2)",
  pedido_urgente_cupos:
    "Cupos urgentes que quedan; baja solo con cada pedido urgente",
  armado: "Ofrece el servicio de armado en /cotizar",
  alisado: "Ofrece el servicio de alisado en /cotizar",
  tienda_abierta: "Si está apagado, la tienda no acepta compras",
  tienda_sena_porcentaje: "Porcentaje de seña en la tienda",
  pedidos_por_mayor:
    "Desde cuántas unidades de un producto se cobra el precio por mayor",
  gran_pedido_por_mayor:
    "Desde cuántas unidades se cobra el precio gran por mayor (más que el por mayor)",
  auto_terminar_por_fotos:
    "Pasa el pedido a Terminado cuando subís las fotos finales",
  publicar_resenas_automatico:
    "Las reseñas nuevas se publican sin que las apruebes",
  promocion_global: "Activa la promoción para todos los pedidos nuevos",
  promocion_descuento: "Descuento de la promoción en % (escribí 15, no 0,15)",
  promocion_mensaje: "Texto del banner de la promoción",
  promocion_inicio: "Desde cuándo vale (vacío = sin límite)",
  promocion_fin: "Hasta cuándo vale, incluido ese día",
  puntos: "Activa los Puntos Kint: se ganan y se canjean",
  puntos_generacion: "Porcentaje de lo pagado que vuelve en puntos",
  puntos_valor: "Cuántos pesos vale cada punto",
  puntos_minimo_uso: "Mínimo de puntos para poder canjear",
  puntos_acreditacion:
    "Estado en el que se acreditan los puntos (dejá «Entregado»)",
  top_kint: "Muestra el ranking público Top Kint",
  top_kint_periodo: "Período del ranking: Histórico, Anual o Semestral",
  fidelidad:
    "Cupones por cantidad de pedidos (no corre si Puntos está prendido)",
  fidelidad_vencimiento: "Días que dura el cupón de fidelidad",
};

const DESCRIPCIONES_PREFIJO: [string, string][] = [
  ["filamento_", "Color disponible en /cotizar"],
  ["boquilla_", "Opción de boquilla en /cotizar"],
  ["fidelidad_hito_", "Descuento en % al llegar a esa cantidad de pedidos"],
  ["promocion_", "Parte de la promoción global"],
  ["puntos_", "Parte de los Puntos Kint"],
];

function descripcion(clave: string) {
  if (DESCRIPCIONES[clave]) return DESCRIPCIONES[clave];
  const prefijo = DESCRIPCIONES_PREFIJO.find(([inicio]) =>
    clave.startsWith(inicio)
  );
  return prefijo ? prefijo[1] : "";
}

/* Claves que cortan o cambian lo que ve el público: se confirman. */
const CRITICAS: Record<string, { prender: string; apagar: string }> = {
  aceptar_pedidos: {
    prender: "/cotizar vuelve a recibir pedidos nuevos.",
    apagar:
      "Nadie va a poder mandar pedidos nuevos desde /cotizar. Van a ver el mensaje de esta opción.",
  },
  estado_pagina: {
    prender: "/cotizar vuelve a funcionar normal.",
    apagar:
      "/cotizar va a mostrar «Cotizaciones pausadas» con el mensaje de esta opción.",
  },
  tienda_abierta: {
    prender: "La tienda vuelve a aceptar compras.",
    apagar:
      "La tienda deja de vender. Los clientes van a ver el mensaje de esta opción.",
  },
  mostrar_aviso_emergente: {
    prender:
      "Va a aparecer un aviso emergente en toda la web con el mensaje de esta opción.",
    apagar: "Se deja de mostrar el aviso emergente en la web.",
  },
};

/* Claves cuyo comentario (columna C) lee el cliente. */
const COMENTARIO_ES_MENSAJE = new Set(["pedido_urgente_cupos"]);

function tituloSeccion(texto: string) {
  const limpio = texto.trim().toLowerCase();
  if (!limpio) return "General";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function estaHabilitada(valor: string | number) {
  return /^(habilitad[ao]|s[ií])$/i.test(String(valor).trim());
}

/* ------------------------------------------------------------------ */
/* Validación de números                                                */
/* ------------------------------------------------------------------ */

const PORCENTAJES = new Set([
  "pedido_urgente_valor",
  "promocion_descuento",
  "puntos_generacion",
]);

function validarNumero(
  clave: string,
  texto: string,
  filas: FilaConfig[]
): { numero: number } | { error: string } {
  const numero = Number(texto.trim().replace(",", "."));
  if (!texto.trim() || !Number.isFinite(numero)) {
    return { error: "Escribí un número." };
  }
  if (numero < 0) return { error: "No puede ser negativo." };

  if (clave === "tienda_sena_porcentaje" && (numero <= 0 || numero >= 100)) {
    return { error: "La seña tiene que estar entre 1 y 99." };
  }
  if (clave === "pedidos_por_mayor" && (!Number.isInteger(numero) || numero < 2)) {
    return { error: "Tiene que ser un número entero de 2 o más." };
  }
  if (clave === "gran_pedido_por_mayor" && numero !== 0) {
    const porMayor = Number(
      filas.find((fila) => fila.clave === "pedidos_por_mayor")?.valor || 0
    );
    if (!Number.isInteger(numero) || numero <= porMayor) {
      return {
        error: `Tiene que ser un entero mayor que ${porMayor} (el por mayor).`,
      };
    }
  }
  if (clave === "pedido_urgente_cupos" && !Number.isInteger(numero)) {
    return { error: "Los cupos son un número entero." };
  }
  if (PORCENTAJES.has(clave) || clave.startsWith("fidelidad_hito_")) {
    if (numero > 100) return { error: "No puede pasar de 100." };
    if (numero > 0 && numero < 1) {
      return { error: "Escribí el porcentaje entero (20, no 0,2)." };
    }
  }
  return { numero };
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

type Cambios = { valor?: string | number; comentario?: string };
type Guardar = (clave: string, cambios: Cambios) => Promise<boolean>;

export default function ConfiguracionAdmin() {
  const { datos, setDatos, error, cargando, recargando, recargar } =
    useDatosAdmin("admin_config_listar", {});
  const avisar = useAvisos();

  const [busqueda, setBusqueda] = useState("");
  const [optimistas, setOptimistas] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState<{
    fila: FilaConfig;
    activo: boolean;
  } | null>(null);

  const filas = useMemo(() => datos?.filas ?? [], [datos]);

  const guardar: Guardar = async (clave, cambios) => {
    try {
      const respuesta = await accionAdmin("admin_config_guardar", {
        clave,
        ...cambios,
      });
      setDatos({ filas: respuesta.filas });
      return true;
    } catch (errorGuardado) {
      avisar(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No se pudo guardar.",
        "error"
      );
      return false;
    }
  };

  async function guardarToggle(fila: FilaConfig, activo: boolean) {
    const valor = activo ? "Habilitada" : "Deshabilitada";
    setOptimistas((actuales) => ({ ...actuales, [fila.clave]: valor }));
    const ok = await guardar(fila.clave, { valor });
    setOptimistas((actuales) => {
      const resto = { ...actuales };
      delete resto[fila.clave];
      return resto;
    });
    if (ok) {
      avisar(`${fila.etiqueta}: ${activo ? "prendido" : "apagado"}`);
    }
  }

  function alCambiarToggle(fila: FilaConfig, activo: boolean) {
    if (CRITICAS[fila.clave]) {
      setConfirmando({ fila, activo });
      return;
    }
    void guardarToggle(fila, activo);
  }

  const secciones = useMemo(() => {
    const lista: { titulo: string; filas: FilaConfig[] }[] = [];
    const termino = normalizar(busqueda.trim());

    for (const fila of filas) {
      if (fila.esSeccion) continue;
      const titulo = tituloSeccion(fila.seccion);
      if (termino) {
        const texto = normalizar(
          [fila.etiqueta, fila.clave, descripcion(fila.clave), titulo].join(" ")
        );
        if (!texto.includes(termino)) continue;
      }
      let seccion = lista.find((item) => item.titulo === titulo);
      if (!seccion) {
        seccion = { titulo, filas: [] };
        lista.push(seccion);
      }
      seccion.filas.push(fila);
    }
    return lista;
  }, [filas, busqueda]);

  return (
    <>
      <Encabezado
        titulo="Configuración"
        subtitulo={
          <span className="inline-flex items-center gap-1.5">
            <Zap size={13} className="text-amber-500" />
            Los cambios se aplican en la web en segundos.
          </span>
        }
        accion={
          datos && (
            <Boton
              variante="fantasma"
              tamano="chico"
              onClick={recargar}
              cargando={recargando}
              icono={<RefreshCw size={15} />}
              aria-label="Actualizar"
              className="h-11 w-11 px-0"
            />
          )
        }
      />

      {cargando && <Esqueleto filas={6} />}

      {!cargando && error && !datos && (
        <CajaError mensaje={error} onReintentar={recargar} />
      )}

      {datos && (
        <>
          <div className="sticky top-[calc(49px+max(0.5rem,env(safe-area-inset-top)))] z-20 -mx-4 bg-[var(--page-bg)]/90 px-4 pb-3 pt-1 backdrop-blur-xl sm:mx-0 sm:px-0 lg:top-0">
            <label className="relative block">
              <span className="sr-only">Buscar una opción</span>
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar (ej. tienda, urgente, filamento)"
                className={`${claseInput} h-11 pl-10 pr-11`}
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  aria-label="Borrar búsqueda"
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X size={16} />
                </button>
              )}
            </label>
          </div>

          {secciones.length === 0 ? (
            busqueda ? (
              <Vacio
                titulo="Nada coincide"
                texto={`No hay opciones que contengan «${busqueda.trim()}».`}
                icono={<Search size={30} strokeWidth={1.5} />}
              />
            ) : (
              <Vacio
                titulo="Sin opciones"
                texto="La hoja Configuración no tiene filas para mostrar."
              />
            )
          ) : (
            secciones.map((seccion, indice) => (
              <section key={seccion.titulo}>
                <div className={indice === 0 ? "-mt-4" : ""}>
                  <TituloSeccion>{seccion.titulo}</TituloSeccion>
                </div>
                <Tarjeta className="divide-y divide-[var(--kint-panel-border)]">
                  {seccion.filas.map((fila) => (
                    <FilaAjuste
                      key={fila.fila}
                      fila={fila}
                      filas={filas}
                      valorOptimista={optimistas[fila.clave]}
                      onToggle={(activo) => alCambiarToggle(fila, activo)}
                      guardar={guardar}
                    />
                  ))}
                </Tarjeta>
              </section>
            ))
          )}
        </>
      )}

      <DialogoConfirmar
        abierto={Boolean(confirmando)}
        titulo={
          confirmando
            ? `${confirmando.activo ? "¿Prender" : "¿Apagar"} «${
                confirmando.fila.etiqueta
              }»?`
            : ""
        }
        mensaje={
          confirmando && (
            <>
              <p>
                {confirmando.activo
                  ? CRITICAS[confirmando.fila.clave]?.prender
                  : CRITICAS[confirmando.fila.clave]?.apagar}
              </p>
              {confirmando.fila.comentario && (
                <p className="mt-3 rounded-xl bg-[var(--kint-panel-soft)] px-3 py-2 text-[13px] italic">
                  {confirmando.fila.comentario}
                </p>
              )}
            </>
          )
        }
        textoConfirmar={confirmando?.activo ? "Prender" : "Apagar"}
        peligro={confirmando ? !confirmando.activo : false}
        onCancelar={() => setConfirmando(null)}
        onConfirmar={() => {
          if (!confirmando) return;
          const { fila, activo } = confirmando;
          setConfirmando(null);
          void guardarToggle(fila, activo);
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Una opción                                                           */
/* ------------------------------------------------------------------ */

function FilaAjuste({
  fila,
  filas,
  valorOptimista,
  onToggle,
  guardar,
}: {
  fila: FilaConfig;
  filas: FilaConfig[];
  valorOptimista?: string;
  onToggle: (activo: boolean) => void;
  guardar: Guardar;
}) {
  const esToggle = fila.tipo === "toggle";
  const texto = descripcion(fila.clave);
  const guardandoToggle = valorOptimista !== undefined;
  const activo = estaHabilitada(valorOptimista ?? fila.valor);
  const idDescripcion = `config-${fila.fila}-desc`;

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{fila.etiqueta}</p>
          {texto && (
            <p
              id={idDescripcion}
              className="mt-0.5 text-xs leading-4 text-[var(--text-muted)]"
            >
              {texto}
            </p>
          )}
        </div>
        {esToggle && (
          <div className="flex min-h-11 items-center">
            <Interruptor
              activo={activo}
              onCambiar={onToggle}
              deshabilitado={guardandoToggle}
              etiqueta={fila.etiqueta}
            />
          </div>
        )}
      </div>

      {!esToggle && (
        <EditorValor
          key={String(fila.valor)}
          fila={fila}
          filas={filas}
          guardar={guardar}
        />
      )}

      <EditorComentario
        key={fila.comentario}
        fila={fila}
        esMensaje={esToggle || COMENTARIO_ES_MENSAJE.has(fila.clave)}
        guardar={guardar}
      />
    </div>
  );
}

function EditorValor({
  fila,
  filas,
  guardar,
}: {
  fila: FilaConfig;
  filas: FilaConfig[];
  guardar: Guardar;
}) {
  const avisar = useAvisos();
  const original = String(fila.valor ?? "");
  const [borrador, setBorrador] = useState(original);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const cambiado = borrador !== original;

  async function enviar(valorTexto: string) {
    let valor: string | number = valorTexto;

    if (fila.tipo === "numero") {
      const resultado = validarNumero(fila.clave, valorTexto, filas);
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      valor = resultado.numero;
    } else {
      valor = valorTexto.trim();
    }

    setError("");
    setGuardando(true);
    const ok = await guardar(fila.clave, { valor });
    setGuardando(false);
    if (ok) {
      /* Si la hoja queda con el mismo valor (ej. "020" → 20) no se remonta
         por key: se vuelve a mostrar el valor guardado. */
      setBorrador(original);
      avisar(`${fila.etiqueta} guardado`);
    } else if (fila.opciones.length > 0) {
      setBorrador(original);
    }
  }

  if (fila.opciones.length > 0) {
    const opciones = fila.opciones.includes(original)
      ? fila.opciones
      : [original, ...fila.opciones];

    return (
      <div className="mt-2.5">
        <select
          value={borrador}
          disabled={guardando}
          aria-label={fila.etiqueta}
          onChange={(evento) => {
            setBorrador(evento.target.value);
            void enviar(evento.target.value);
          }}
          className={`${claseInput} h-11 disabled:opacity-60`}
        >
          {opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion || "Sin valor"}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const anchoInput =
    fila.tipo === "numero"
      ? "w-28"
      : fila.tipo === "fecha"
      ? "w-44"
      : "min-w-0 flex-1";

  return (
    <form
      className="mt-2.5"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (cambiado) void enviar(borrador);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type={fila.tipo === "fecha" ? "date" : "text"}
          inputMode={fila.tipo === "numero" ? "decimal" : undefined}
          value={borrador}
          disabled={guardando}
          aria-label={fila.etiqueta}
          aria-invalid={Boolean(error)}
          onChange={(evento) => {
            setBorrador(evento.target.value);
            setError("");
          }}
          className={`${claseInput} h-11 ${anchoInput} ${
            error ? "border-red-500" : ""
          }`}
        />
        {cambiado && (
          <>
            <Boton type="submit" variante="principal" cargando={guardando}>
              Guardar
            </Boton>
            <Boton
              variante="fantasma"
              disabled={guardando}
              onClick={() => {
                setBorrador(original);
                setError("");
              }}
            >
              Deshacer
            </Boton>
          </>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}

function EditorComentario({
  fila,
  esMensaje,
  guardar,
}: {
  fila: FilaConfig;
  esMensaje: boolean;
  guardar: Guardar;
}) {
  const avisar = useAvisos();
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState(fila.comentario);
  const [guardando, setGuardando] = useState(false);
  const titulo = esMensaje ? "Mensaje para el cliente" : "Comentario";
  const idCampo = `config-${fila.fila}-comentario`;

  async function enviar() {
    setGuardando(true);
    const ok = await guardar(fila.clave, { comentario: borrador.trim() });
    setGuardando(false);
    if (ok) avisar(`${titulo} guardado`);
  }

  if (!abierto) {
    return (
      <div className="mt-1.5">
        {fila.comentario && (
          <p
            className={`mb-0.5 line-clamp-2 text-[13px] leading-5 text-[var(--text-muted)] ${
              esMensaje ? "italic" : ""
            }`}
          >
            {esMensaje ? `«${fila.comentario}»` : fila.comentario}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setBorrador(fila.comentario);
            setAbierto(true);
          }}
          className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-xs font-bold text-[var(--blue-main)] hover:underline dark:text-[var(--blue-soft)]"
        >
          <MessageSquareText size={14} />
          {fila.comentario
            ? esMensaje
              ? "Editar mensaje"
              : "Editar comentario"
            : esMensaje
            ? "Agregar mensaje"
            : "Agregar comentario"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-[var(--kint-panel-soft)] p-3">
      <label
        htmlFor={idCampo}
        className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]"
      >
        {titulo}
      </label>
      <textarea
        id={idCampo}
        value={borrador}
        onChange={(evento) => setBorrador(evento.target.value)}
        rows={4}
        maxLength={1000}
        disabled={guardando}
        className={`${claseInput} resize-y leading-5`}
      />
      {esMensaje && (
        <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
          Es lo que ve el cliente cuando esta opción está apagada o como
          descripción en la web.
        </p>
      )}
      <div className="mt-2.5 flex justify-end gap-2">
        <Boton
          variante="fantasma"
          disabled={guardando}
          onClick={() => setAbierto(false)}
        >
          Cancelar
        </Boton>
        <Boton
          variante="principal"
          cargando={guardando}
          disabled={borrador.trim() === fila.comentario.trim()}
          onClick={() => void enviar()}
        >
          Guardar
        </Boton>
      </div>
    </div>
  );
}
