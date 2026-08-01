import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 space-y-6">
      <BrandLogo variant="header" />
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Privacidad
        </h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Habit Dock es una app personal de hábitos. Sin anuncios ni tracking de
          terceros.
        </p>
      </div>

      <section className="space-y-2 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-base font-semibold">Qué guardamos</h2>
        <ul className="list-disc pl-5 space-y-1 text-muted">
          <li>Email, nombre y hash de contraseña</li>
          <li>Hábitos (nombre, color, tipo, meta, días)</li>
          <li>Marcas diarias (completado / no)</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-base font-semibold">Dónde</h2>
        <p className="text-muted">
          Hosting en Vercel. Base de datos PostgreSQL en Neon. La sesión usa
          cookies de NextAuth.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-base font-semibold">Tus datos</h2>
        <p className="text-muted">
          Desde Cuenta puedes exportar un JSON con hábitos y marcas, o borrar
          la cuenta por completo.
        </p>
      </section>

      <p className="text-sm">
        <Link href="/" className="text-accent hover:underline">
          Volver al Dock
        </Link>
      </p>
    </div>
  );
}
