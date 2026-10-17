"use client";

import { useRef, useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { accionAdmin } from "@/lib/admin-cliente";
import type { FilaConfig } from "@/lib/admin-tipos";
import { Boton, claseInput, useAvisos } from "@/components/admin/ui";

/*
 * Agregar y borrar opciones de Configuración desde el panel:
 * filamentos (con color y foto) e hitos de fidelidad.
 */

type AlCambiar = (filas: FilaConfig[]) => void;

/* Achica la foto en el navegador (lado mayor 900 px, WebP) antes de subirla. */
async function achicarFoto(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, 900 / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo leer la foto."))), "image/webp", 0.85)
  );
}

export function AgregarFilamento({ onFilas }: { onFilas: AlCambiar }) {
  const avisar = useAvisos();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [foto, setFoto] = useState<File | null>(null);
  const [vista, setVista] = useState("");
  const [guardando, setGuardando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  async function guardar() {
    setGuardando(true);
    try {
      let url = "";
      if (foto) {
        const datos = new FormData();
        datos.append("foto", new File([await achicarFoto(foto)], "foto.webp", { type: "image/webp" }));
        const respuesta = await fetch("/api/admin/foto", { method: "POST", body: datos });
        const resultado = await respuesta.json();
        if (!resultado.ok) throw new Error(resultado.error || "No se pudo subir la foto.");
        url = resultado.url;
      }
      const respuesta = await accionAdmin("admin_config_agregar", { clase: "filamento", nombre: nombre.trim(), color, foto: url });
      onFilas(respuesta.filas);
      avisar(`Filamento ${nombre.trim()} agregado`);
      setNombre("");
      setFoto(null);
      setVista("");
      setAbierto(false);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo agregar.", "error");
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <Boton variante="secundario" tamano="chico" className="mt-2.5" icono={<Plus size={14} />} onClick={() => setAbierto(true)}>
        Agregar color
      </Boton>
    );
  }

  return (
    <div className="mt-2.5 rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] p-3.5">
      <p className="text-sm font-black">Nuevo filamento</p>
      <div className="mt-2.5 flex flex-wrap items-end gap-2.5">
        <label className="block min-w-40 flex-1">
          <span className="mb-1 block text-[11px] font-bold text-[var(--text-muted)]">Nombre del color</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} placeholder="Ej.: Naranja" className={`${claseInput} h-10`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-[var(--text-muted)]">Color</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-16 cursor-pointer rounded-xl border border-[var(--kint-panel-border)] bg-transparent p-1"
          />
        </label>
        <div>
          <span className="mb-1 block text-[11px] font-bold text-[var(--text-muted)]">Foto del carrete (opcional)</span>
          <input
            ref={entrada}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const archivo = e.target.files?.[0] || null;
              setFoto(archivo);
              setVista(archivo ? URL.createObjectURL(archivo) : "");
            }}
          />
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="flex h-10 items-center gap-2 rounded-xl border border-dashed border-[var(--kint-panel-border)] px-3 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            {vista ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vista} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <ImagePlus size={15} />
            )}
            {foto ? "Cambiar foto" : "Elegir foto"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Boton variante="fantasma" tamano="chico" disabled={guardando} onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
        <Boton variante="principal" tamano="chico" cargando={guardando} disabled={!nombre.trim()} onClick={() => void guardar()}>
          Agregar
        </Boton>
      </div>
    </div>
  );
}

export function AgregarHito({ onFilas }: { onFilas: AlCambiar }) {
  const avisar = useAvisos();
  const [pedidos, setPedidos] = useState("");
  const [descuento, setDescuento] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_config_agregar", {
        clase: "fidelidad",
        pedidos: Number(pedidos),
        descuento: Number(descuento),
      });
      onFilas(respuesta.filas);
      avisar(`Premio al pedido n.º ${pedidos} agregado`);
      setPedidos("");
      setDescuento("");
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo agregar.", "error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--kint-panel-border)] pt-3">
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold text-[var(--text-muted)]">Al llegar al pedido n.º</span>
        <input value={pedidos} onChange={(e) => setPedidos(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="8" className={`${claseInput} h-10 w-28`} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold text-[var(--text-muted)]">Descuento</span>
        <span className="relative block">
          <input value={descuento} onChange={(e) => setDescuento(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="10" className={`${claseInput} h-10 w-24 pr-8`} />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--text-muted)]">%</span>
        </span>
      </label>
      <Boton variante="secundario" tamano="chico" className="h-10" icono={<Plus size={14} />} cargando={guardando} disabled={!pedidos || !descuento} onClick={() => void guardar()}>
        Agregar premio
      </Boton>
    </div>
  );
}

export function BorrarConfig({ fila, onFilas, texto }: { fila: FilaConfig; onFilas: AlCambiar; texto: string }) {
  const avisar = useAvisos();
  const [guardando, setGuardando] = useState(false);
  return (
    <button
      type="button"
      title={`Borrar ${texto}`}
      aria-label={`Borrar ${texto}`}
      disabled={guardando}
      onClick={async () => {
        if (!window.confirm(`¿Borrar ${texto}?`)) return;
        setGuardando(true);
        try {
          const respuesta = await accionAdmin("admin_config_borrar", { clave: fila.clave });
          onFilas(respuesta.filas);
          avisar(`${texto} borrado`);
        } catch (error) {
          avisar(error instanceof Error ? error.message : "No se pudo borrar.", "error");
        } finally {
          setGuardando(false);
        }
      }}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
    >
      <Trash2 size={14} />
    </button>
  );
}
