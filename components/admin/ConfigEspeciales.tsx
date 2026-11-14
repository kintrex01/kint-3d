"use client";

import { useState } from "react";
import type { FilaConfig } from "@/lib/admin-tipos";
import { Interruptor, Tarjeta, useAvisos } from "@/components/admin/ui";
import { colorFilamento, extrasFilamento } from "@/lib/colores-filamento";
import InsigniaTop from "@/components/InsigniaTop";

/*
 * Opciones de Configuración con su propia pantalla (en vez de la fila genérica):
 * - Top Kint: prendido, cuántos se ven, período, celular, puntos e insignias.
 * - Cotizar: lo que viene elegido en el formulario («Que elijan» = vacío).
 */

type Guardar = (clave: string, cambios: { valor?: string | number; comentario?: string }) => Promise<boolean>;

export const CLAVES_TOP_KINT = [
  "top_kint",
  "top_kint_cantidad",
  "top_kint_periodo",
  "top_kint_celular",
  "top_kint_puntos",
  "top_kint_insignias",
];

export const QUE_ELIJAN = "Que elijan";

const habilitada = (valor: unknown) => /^habilitad/i.test(String(valor ?? "").trim());

/* Chips para elegir una opción. */
function Chips({
  opciones,
  valor,
  onElegir,
  deshabilitado,
}: {
  opciones: { valor: string; texto: string; color?: string; apagada?: boolean }[];
  valor: string;
  onElegir: (valor: string) => void;
  deshabilitado?: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={activa}
            disabled={deshabilitado}
            onClick={() => !activa && onElegir(opcion.valor)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-black transition disabled:opacity-60 ${
              activa
                ? "border-transparent bg-[var(--text-main)] text-[var(--kint-panel)] shadow-md"
                : `border-[var(--kint-panel-border)] bg-[var(--kint-panel)] hover:text-[var(--text-main)] ${
                    opcion.apagada ? "text-[var(--text-muted)]/60 line-through" : "text-[var(--text-muted)]"
                  }`
            }`}
          >
            {opcion.color && (
              <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15" style={{ background: opcion.color }} />
            )}
            {opcion.texto}
          </button>
        );
      })}
    </div>
  );
}

function Opcion({ titulo, detalle, children }: { titulo: string; detalle?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[var(--kint-panel-border)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      {children}
      <p className="sr-only">{titulo}</p>
      {detalle && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{detalle}</p>}
    </div>
  );
}

/* Guarda una opción mostrando el cambio al instante. */
function useGuardarRapido(filas: FilaConfig[], guardar: Guardar) {
  const avisar = useAvisos();
  const [pendientes, setPendientes] = useState<Record<string, string | number>>({});
  const valor = (clave: string) =>
    pendientes[clave] !== undefined ? pendientes[clave] : filas.find((fila) => fila.clave === clave)?.valor ?? "";
  async function cambiar(clave: string, nuevo: string | number, texto: string) {
    setPendientes((actuales) => ({ ...actuales, [clave]: nuevo }));
    const ok = await guardar(clave, { valor: nuevo });
    setPendientes((actuales) => {
      const resto = { ...actuales };
      delete resto[clave];
      return resto;
    });
    if (ok) avisar(texto);
  }
  return { valor, cambiar, guardando: (clave: string) => pendientes[clave] !== undefined };
}

/* ------------------------------------------------------------------ */
/* Top Kint                                                            */
/* ------------------------------------------------------------------ */

export function ConfigTopKint({ filas, guardar }: { filas: FilaConfig[]; guardar: Guardar }) {
  const { valor, cambiar, guardando } = useGuardarRapido(filas, guardar);
  if (!filas.some((fila) => fila.clave === "top_kint")) return null;

  const prendido = habilitada(valor("top_kint"));
  const periodo = String(valor("top_kint_periodo") || "Histórico");
  const cantidad = String(Math.round(Number(valor("top_kint_cantidad")) || 3));

  const interruptor = (clave: string, titulo: string, detalle: string, encendido: string, apagado: string) => (
    <Opcion titulo={titulo} detalle={detalle}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-[var(--text-main)]">{titulo}</p>
        <Interruptor
          etiqueta={titulo}
          activo={habilitada(valor(clave))}
          deshabilitado={guardando(clave) || (clave !== "top_kint" && !prendido)}
          onCambiar={(activo) =>
            void cambiar(clave, activo ? "Habilitada" : "Deshabilitada", `${titulo}: ${activo ? encendido : apagado}`)
          }
        />
      </div>
    </Opcion>
  );

  return (
    <Tarjeta className="mb-4 p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex -space-x-2">
          <InsigniaTop puesto={2} tamano="md" />
          <InsigniaTop puesto={1} tamano="md" className="relative z-10 -translate-y-1" />
          <InsigniaTop puesto={3} tamano="md" />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-black text-[var(--text-main)]">Top Kint</p>
          <p className="text-xs text-[var(--text-muted)]">El ranking de clientes por Puntos Kint ganados.</p>
        </div>
      </div>

      {interruptor("top_kint", "Mostrar el ranking", "Apagado, no se ve en ningún lado (ni las insignias).", "prendido", "apagado")}

      <Opcion titulo="Cuántos se ven" detalle="Cuántos clientes aparecen en el ranking.">
        <p className="font-bold text-[var(--text-main)]">Cuántos se ven</p>
        <Chips
          valor={cantidad}
          deshabilitado={!prendido || guardando("top_kint_cantidad")}
          opciones={["3", "5", "10"].map((n) => ({ valor: n, texto: `Top ${n}` }))}
          onElegir={(nuevo) => void cambiar("top_kint_cantidad", Number(nuevo), `Top Kint: se ven ${nuevo}`)}
        />
      </Opcion>

      <Opcion titulo="Período" detalle="Qué puntos cuentan: todos, los de este año o los de este semestre.">
        <p className="font-bold text-[var(--text-main)]">Período</p>
        <Chips
          valor={periodo}
          deshabilitado={!prendido || guardando("top_kint_periodo")}
          opciones={["Histórico", "Anual", "Semestral"].map((texto) => ({ valor: texto, texto }))}
          onElegir={(nuevo) => void cambiar("top_kint_periodo", nuevo, `Top Kint: período ${nuevo.toLowerCase()}`)}
        />
      </Opcion>

      {interruptor("top_kint_celular", "También en el celular", "En la computadora se ve al costado; en el celular, abajo de las estadísticas del inicio.", "se ve en el celular", "solo en la computadora")}
      {interruptor("top_kint_puntos", "Mostrar los puntos", "Apagado, se ve solo el puesto y el alias.", "con puntos", "sin puntos")}
      {interruptor("top_kint_insignias", "Insignias del podio", "Oro, plata y bronce para los 3 primeros: en el ranking, en sus reseñas y en su cuenta.", "prendidas", "apagadas")}
    </Tarjeta>
  );
}

/* ------------------------------------------------------------------ */
/* Cotizar: lo que viene elegido                                       */
/* ------------------------------------------------------------------ */

const ESCALAS = ["1:50", "1:75", "1:100", "1:200", "1:250", "1:500", "1:1000", "No es necesario"];

export function PredeterminadosCotizar({ filas, guardar }: { filas: FilaConfig[]; guardar: Guardar }) {
  const { valor, cambiar, guardando } = useGuardarRapido(filas, guardar);
  const fila = (clave: string) => filas.find((item) => item.clave === clave);
  if (!fila("cotizar_escala")) return null;

  const armadoPrendido = habilitada(fila("armado")?.valor);
  const boquilla02 = habilitada(fila("boquilla_0_2")?.valor);
  const boquilla04 = habilitada(fila("boquilla_0_4")?.valor);

  const colores = filas
    .filter((item) => item.clave.startsWith("filamento_") && item.tipo === "toggle" && habilitada(item.valor))
    .map((item) => {
      // Mismo nombre que usa /cotizar (sale de la clave: «filamento_gris_claro» → «Gris Claro»).
      const nombre = item.clave
        .replace(/^filamento_/, "")
        .split("_")
        .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(" ");
      const extras = extrasFilamento(item.comentario);
      return { valor: nombre, texto: extras.nombre || nombre, color: extras.color || colorFilamento(nombre) };
    });

  const quien = { valor: QUE_ELIJAN, texto: "Vacío (que elijan)" };
  const campo = (clave: string, titulo: string, opciones: { valor: string; texto: string; color?: string; apagada?: boolean }[], detalle: string) => (
    <Opcion titulo={titulo} detalle={detalle}>
      <p className="font-bold text-[var(--text-main)]">{titulo}</p>
      <Chips
        valor={String(valor(clave) || QUE_ELIJAN)}
        deshabilitado={guardando(clave)}
        opciones={[quien, ...opciones]}
        onElegir={(nuevo) =>
          void cambiar(clave, nuevo, `${titulo}: ${nuevo === QUE_ELIJAN ? "vacío, lo eligen ellos" : `viene «${nuevo}»`}`)
        }
      />
    </Opcion>
  );

  return (
    <Tarjeta className="mb-4 p-5">
      <p className="text-lg font-black text-[var(--text-main)]">Lo que viene elegido en /cotizar</p>
      <p className="mb-4 mt-1 text-xs text-[var(--text-muted)]">
        «Vacío» = el cliente lo tiene que elegir (si no, no puede mandar el pedido). Si elegís una opción,
        ya viene puesta y la puede cambiar.
      </p>

      {campo("cotizar_escala", "Escala", ESCALAS.map((texto) => ({ valor: texto, texto })), "La escala de la maqueta.")}
      {campo("cotizar_color", "Color", colores, "Viene marcado ese color; pueden sumar otros o cambiarlo.")}
      {campo(
        "cotizar_armado",
        "Armado de piezas",
        [
          { valor: "Sí", texto: "Sí" },
          { valor: "No", texto: "No" },
        ],
        armadoPrendido ? "Si quieren que les armes las piezas." : "El armado está apagado (Servicios): no se pregunta y va «No»."
      )}
      {campo(
        "cotizar_boquilla",
        "Boquilla",
        [
          { valor: "0.2", texto: "0.2 mm", apagada: !boquilla02 },
          { valor: "0.4", texto: "0.4 mm", apagada: !boquilla04 },
          { valor: "Que Kint 3D decida", texto: "Que Kint 3D decida" },
        ],
        boquilla02 && boquilla04
          ? "Solo se pregunta cuando están prendidas las dos boquillas."
          : "Ahora hay una sola boquilla prendida: no se pregunta y va esa."
      )}
    </Tarjeta>
  );
}
