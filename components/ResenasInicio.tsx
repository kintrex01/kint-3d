"use client";

import { useEffect, useState } from "react";

type Resena = {
  pedido: string;
  nombre: string;
  estrellas: number;
  comentario: string;
  insignia: string;
};

export default function ResenasInicio() {
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarResenas() {
      try {
        const response = await fetch("/api/resenas");
        const data = await response.json();

        if (data.ok) {
          setResenas(data.resenas || []);
        }
      } catch (error) {
        console.error(error);
      }

      setLoading(false);
    }

    cargarResenas();
  }, []);

  if (loading) {
    return <p>Cargando reseñas...</p>;
  }

  if (!resenas.length) {
    return <p>No hay reseñas disponibles.</p>;
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {resenas.map((resena, index) => (
        <div
          key={index}
          className="border border-[var(--border-color)] p-8"
        >
          <p className="mb-4 text-2xl text-red-600">
            {"★".repeat(Number(resena.estrellas))}
          </p>

          <p className="mb-6 text-sm italic text-[var(--text-muted)]">
            "{resena.comentario}"
          </p>

          <p className="text-xs font-bold uppercase tracking-[0.25em]">
            ✓ Cliente verificado
          </p>

          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Pedido: {resena.pedido}
          </p>

          {resena.insignia && (
  <div className="mt-4 flex justify-center">
    <span className="border border-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-red-600">
      {resena.insignia}
    </span>
  </div>
)}
        </div>
      ))}
    </div>
  );
}