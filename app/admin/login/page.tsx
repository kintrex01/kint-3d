"use client";

import { Eye, EyeOff, LoaderCircle, Lock } from "lucide-react";
import { useEffect, useState } from "react";

export default function LoginAdmin() {
  const [contrasena, setContrasena] = useState("");
  const [visible, setVisible] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  // El tema guardado también aplica acá.
  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      localStorage.getItem("theme") === "dark"
    );
  }, []);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!contrasena || enviando) return;

    setEnviando(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contrasena }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "No pudimos entrar.");
      }

      // Solo se vuelve a rutas internas del panel.
      const volver = new URLSearchParams(window.location.search).get("volver");
      window.location.href =
        volver && volver.startsWith("/admin") && !volver.startsWith("//")
          ? volver
          : "/admin";
    } catch (errorLogin: unknown) {
      setError(
        errorLogin instanceof Error ? errorLogin.message : "No pudimos entrar."
      );
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-5 text-[var(--text-main)]">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm rounded-3xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] p-7 shadow-[var(--shadow-soft)]"
      >
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--acento)] text-white">
            <Lock size={24} />
          </div>
          <p className="kint-logo-font text-2xl">
            KINT <span className="text-[var(--blue-main)]">3D</span>
          </p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Panel de gestión
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">
            Contraseña
          </span>
          <div className="relative">
            <input
              type={visible ? "text" : "password"}
              value={contrasena}
              onChange={(evento) => setContrasena(evento.target.value)}
              autoComplete="current-password"
              // En el celular: sin mayúscula automática ni autocorrector.
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              className="w-full rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-4 py-3 pr-12 text-base text-[var(--text-main)] outline-none focus:border-[var(--kint-selected-border)] focus:ring-2 focus:ring-[var(--acento)]/20"
            />
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[var(--text-muted)]"
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-400"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!contrasena || enviando}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[rgba(90,145,235,0.35)] bg-[var(--acento)] text-sm font-black uppercase tracking-[0.18em] text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {enviando && <LoaderCircle size={16} className="animate-spin" />}
          Entrar
        </button>

        <p className="mt-5 text-center text-[11px] leading-4 text-[var(--text-muted)]">
          La sesión queda abierta 30 días en este dispositivo.
        </p>
      </form>
    </main>
  );
}
