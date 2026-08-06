export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-linear-to-br from-[oklch(0.28_0.08_262)] via-[oklch(0.4_0.15_262)] to-[oklch(0.55_0.19_258)] p-4">
      {/* Mural decorativo: formas suaves difuminadas, puramente visual */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-32 size-112 rounded-full bg-[oklch(0.7_0.14_195)]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/4 size-104 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-size-[28px_28px] opacity-[0.06]"
      />

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
