"use client";

import { useEffect, useRef, useState } from "react";
import {
  Ban,
  Coins,
  Crown,
  LoaderCircle,
  Mail,
  MessageCircle,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { ClienteAdmin } from "@/lib/admin-tipos";
import {
  Boton,
  CajaError,
  Chip,
  DialogoConfirmar,
  Encabezado,
  Esqueleto,
  Tarjeta,
  Vacio,
  claseInput,
  linkWhatsapp,
  useAvisos,
} from "@/components/admin/ui";
import { HistorialCliente } from "@/components/admin/clientes/HistorialCliente";

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/* ISO → "23 oct 2025". */
function fechaRegistro(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

function estaBloqueado(cliente: ClienteAdmin) {
  return String(cliente.estado ?? "").trim().toLowerCase() === "bloqueado";
}

export default function ClientesAdmin() {
  const avisar = useAvisos();
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const temporizador = useRef<number | undefined>(undefined);

  /* La búsqueda se dispara con recargar() para mostrar el estado "buscando". */
  const { datos, setDatos, error, cargando, recargando, recargar } =
    useDatosAdmin("admin_clientes_buscar", { q });

  const [confirmando, setConfirmando] = useState<ClienteAdmin | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  function buscar(valor: string, demora = 400) {
    setTexto(valor);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      setQ(valor.trim());
      recargar();
    }, demora);
  }

  async function cambiarEstado() {
    if (!confirmando) return;
    const bloquear = !estaBloqueado(confirmando);
    setGuardando(true);

    try {
      const respuesta = await accionAdmin("admin_cliente_estado", {
        email: confirmando.email,
        bloqueado: bloquear,
      });
      setDatos((actual) =>
        actual
          ? {
              clientes: actual.clientes.map((cliente) =>
                cliente.email === confirmando.email
                  ? respuesta.cliente
                  : cliente
              ),
            }
          : actual
      );
      avisar(
        bloquear
          ? `${confirmando.nombre || confirmando.email} quedó bloqueado`
          : `${confirmando.nombre || confirmando.email} quedó desbloqueado`
      );
      setConfirmando(null);
    } catch (errorGuardado) {
      avisar(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No se pudo cambiar el estado.",
        "error"
      );
    } finally {
      setGuardando(false);
    }
  }

  const clientes = datos?.clientes ?? [];
  const bloquearConfirmando = confirmando ? !estaBloqueado(confirmando) : false;

  return (
    <>
      <Encabezado
        titulo="Clientes"
        subtitulo="Buscá por nombre, alias o email."
      />

      <div className="sticky top-[calc(49px+max(0.5rem,env(safe-area-inset-top)))] z-20 -mx-4 mb-1 bg-[var(--page-bg)]/90 px-4 pb-3 pt-1 backdrop-blur-xl sm:mx-0 sm:px-0 lg:top-0">
        <label className="relative block">
          <span className="sr-only">Buscar clientes</span>
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="search"
            value={texto}
            onChange={(evento) => buscar(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") buscar(texto, 0);
            }}
            placeholder="Nombre, alias o email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className={`${claseInput} h-11 pl-10 pr-11`}
          />
          <span className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center">
            {recargando ? (
              <LoaderCircle
                size={16}
                className="animate-spin text-[var(--text-muted)]"
                aria-label="Buscando"
              />
            ) : (
              texto && (
                <button
                  type="button"
                  onClick={() => buscar("", 0)}
                  aria-label="Borrar búsqueda"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X size={16} />
                </button>
              )
            )}
          </span>
        </label>
      </div>

      {cargando && <Esqueleto filas={5} />}

      {!cargando && error && !datos && (
        <CajaError mensaje={error} onReintentar={recargar} />
      )}

      {!cargando && error && datos && (
        <p className="mb-3 text-sm font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {datos &&
        (clientes.length === 0 ? (
          <Vacio
            icono={<Users size={30} strokeWidth={1.5} />}
            titulo={q ? "Sin resultados" : "Todavía no hay clientes"}
            texto={
              q
                ? `No encontramos clientes con «${q}». Probá con otra parte del nombre o del email.`
                : "Los clientes aparecen acá cuando hacen su primer pedido o compra."
            }
          />
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold text-[var(--text-muted)]">
              {q
                ? `${clientes.length} ${
                    clientes.length === 1 ? "resultado" : "resultados"
                  }`
                : "Últimos clientes registrados"}
            </p>
            <div
              className={`space-y-3 transition-opacity ${
                recargando ? "opacity-60" : ""
              }`}
            >
              {clientes.map((cliente) => (
                <TarjetaCliente
                  key={cliente.email}
                  cliente={cliente}
                  onCambiarEstado={() => setConfirmando(cliente)}
                />
              ))}
            </div>
          </>
        ))}

      <DialogoConfirmar
        abierto={Boolean(confirmando)}
        titulo={
          bloquearConfirmando ? "¿Bloquear al cliente?" : "¿Desbloquear al cliente?"
        }
        mensaje={
          confirmando && (
            <>
              <p className="font-bold text-[var(--text-main)]">
                {confirmando.nombre || confirmando.email}
              </p>
              <p className="mt-2">
                {bloquearConfirmando
                  ? "No va a poder hacer pedidos en /cotizar ni comprar en la tienda. Sus pedidos actuales no cambian."
                  : "Va a poder volver a hacer pedidos y comprar en la tienda."}
              </p>
            </>
          )
        }
        textoConfirmar={bloquearConfirmando ? "Bloquear" : "Desbloquear"}
        peligro={bloquearConfirmando}
        cargando={guardando}
        onCancelar={() => setConfirmando(null)}
        onConfirmar={() => void cambiarEstado()}
      />
    </>
  );
}

function TarjetaCliente({
  cliente,
  onCambiarEstado,
}: {
  cliente: ClienteAdmin;
  onCambiarEstado: () => void;
}) {
  const bloqueado = estaBloqueado(cliente);
  const registro = fechaRegistro(cliente.registro);

  return (
    <Tarjeta className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black">
            {cliente.nombre || "Sin nombre"}
          </p>
          {cliente.alias && (
            <p className="truncate text-sm text-[var(--text-muted)]">
              @{cliente.alias}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {cliente.topKint && (
            <Chip tono="violeta">
              <Crown size={11} />
              Top Kint
            </Chip>
          )}
          <Chip tono={bloqueado ? "rojo" : "verde"}>
            {bloqueado ? "Bloqueado" : "Activo"}
          </Chip>
        </div>
      </div>

      <a
        href={`mailto:${cliente.email}`}
        className="mt-2 inline-flex min-h-11 max-w-full items-center gap-2 text-sm font-semibold text-[var(--blue-main)] hover:underline dark:text-[var(--blue-soft)]"
      >
        <Mail size={15} className="shrink-0" />
        <span className="truncate">{cliente.email}</span>
      </a>

      {cliente.telefono ? (
        <a
          href={linkWhatsapp(
            cliente.telefono,
            `Hola ${cliente.nombre.split(" ")[0] || ""}, te escribo de Kint 3D.`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 max-w-full items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
        >
          <MessageCircle size={15} className="shrink-0" />
          <span className="truncate">WhatsApp {cliente.telefono}</span>
        </a>
      ) : (
        <p className="flex min-h-9 items-center gap-2 text-xs text-[var(--text-muted)]">
          <MessageCircle size={14} className="shrink-0" />
          Sin celular (se lo pedimos en su próximo pedido)
        </p>
      )}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--kint-panel-border)] pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Coins size={14} className="text-amber-500" />
            <span className="font-bold text-[var(--text-main)]">
              {Number(cliente.puntos || 0).toLocaleString("es-UY")}
            </span>
            puntos
          </span>
          {registro && <span>Desde el {registro}</span>}
        </div>
        <Boton
          variante={bloqueado ? "secundario" : "peligro"}
          icono={bloqueado ? <UserCheck size={15} /> : <Ban size={15} />}
          onClick={onCambiarEstado}
        >
          {bloqueado ? "Desbloquear" : "Bloquear"}
        </Boton>
      </div>

      <HistorialCliente email={cliente.email} />
    </Tarjeta>
  );
}
