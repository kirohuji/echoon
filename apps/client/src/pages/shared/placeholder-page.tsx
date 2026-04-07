type Props = {
  title: string;
  desc: string;
};

export function PlaceholderPage({ title, desc }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </section>
  );
}

