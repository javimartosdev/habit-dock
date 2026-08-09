"use client";

import { FormEvent, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Download } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useRank } from "@/components/rank-provider";
import {
  POINTS_OPTIMAL_DAY,
  POINTS_PERFECT_WEEK,
  rankIconSrc,
} from "@/lib/ranks";

export function SettingsForm({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  const { rank, refresh } = useRank();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMsg("");
    setPasswordError("");

    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setPasswordSaving(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setPasswordError(data?.error ?? "No se pudo cambiar la contraseña");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setPasswordMsg("Contraseña actualizada");
  }

  async function deleteAccount(e: FormEvent) {
    e.preventDefault();
    setDeleteError("");
    setDeleting(true);

    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: deleteConfirm }),
    });

    if (!res.ok) {
      setDeleting(false);
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setDeleteError(data?.error ?? "No se pudo borrar la cuenta");
      return;
    }

    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Cuenta
        </h1>
        <p className="mt-1 text-sm text-muted">
          {name}
          {email ? ` · ${email}` : ""}
        </p>
      </div>

      <section id="rangos" className="space-y-3 scroll-mt-24">
        <h2 className="font-display text-base font-semibold tracking-tight">
          Rangos
        </h2>
        {rank && (
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface-elevated/80 px-3.5 py-3">
            <img
              src={rank.iconSrc}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 image-pixelated"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Rango {rank.rankIndex}
              </p>
              <p className="text-xs text-muted">
                {rank.points.toLocaleString("es-ES")} pts
                {rank.pointsToNext != null
                  ? ` · ${rank.pointsToNext.toLocaleString("es-ES")} para el siguiente`
                  : " · rango máximo"}
              </p>
            </div>
          </div>
        )}
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            Un toque de progreso a largo plazo. Solo sube; fallar una semana no
            te baja de rango.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="text-foreground font-medium">
                Día completo
              </span>{" "}
              (todos los hábitos del día): +{POINTS_OPTIMAL_DAY} pts
            </li>
            <li>
              <span className="text-foreground font-medium">
                Semana perfecta
              </span>{" "}
              (todas las metas cumplidas): +{POINTS_PERFECT_WEEK} pts extra
            </li>
            <li>
              El primer día completo te lleva del pollito al martillo (rango 1)
            </li>
            <li>Cada rango siguiente pide más puntos acumulados</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Array.from({ length: 26 }, (_, i) => (
            <img
              key={i}
              src={rankIconSrc(i)}
              alt={`Rango ${i}`}
              title={`Rango ${i}`}
              width={28}
              height={28}
              className={`h-7 w-7 image-pixelated rounded-sm ${
                rank && i === rank.rankIndex
                  ? "ring-2 ring-accent/50 ring-offset-1 ring-offset-background"
                  : i > (rank?.rankIndex ?? 0)
                    ? "opacity-35"
                    : "opacity-90"
              }`}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold tracking-tight">
          Exportar datos
        </h2>
        <p className="text-sm text-muted leading-relaxed">
          Descarga tus hábitos y marcas en JSON. Útil como copia o si quieres
          irte con tus datos.
        </p>
        <a
          href="/api/account/export"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
        >
          <Download className="h-4 w-4" />
          Descargar JSON
        </a>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold tracking-tight">
          Cambiar contraseña
        </h2>
        <form onSubmit={changePassword} className="space-y-3">
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Contraseña actual"
            required
            autoComplete="current-password"
          />
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nueva (mín. 6 caracteres)"
            required
            minLength={6}
            autoComplete="new-password"
          />
          {passwordError && (
            <p className="text-sm text-danger">{passwordError}</p>
          )}
          {passwordMsg && (
            <p className="text-sm text-success">{passwordMsg}</p>
          )}
          <Button type="submit" size="sm" disabled={passwordSaving}>
            {passwordSaving ? "Guardando…" : "Actualizar contraseña"}
          </Button>
        </form>
      </section>

      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="font-display text-base font-semibold tracking-tight text-danger">
          Borrar cuenta
        </h2>
        <p className="text-sm text-muted leading-relaxed">
          Se eliminan tus hábitos, marcas y la cuenta. No se puede deshacer.
          Escribe <span className="font-medium text-foreground">BORRAR</span>{" "}
          para confirmar.
        </p>
        <form onSubmit={deleteAccount} className="space-y-3">
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="BORRAR"
            autoComplete="off"
          />
          {deleteError && (
            <p className="text-sm text-danger">{deleteError}</p>
          )}
          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={deleting || deleteConfirm !== "BORRAR"}
          >
            {deleting ? "Borrando…" : "Borrar mi cuenta"}
          </Button>
        </form>
      </section>

      <p className="text-xs text-muted">
        Más sobre datos:{" "}
        <a href="/privacy" className="underline hover:text-foreground">
          Privacidad
        </a>
      </p>
    </div>
  );
}
