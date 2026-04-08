type Props = {
  title: string;
  desc: string;
};

export function PlaceholderPage({ title, desc }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{desc}</p>
    </section>
  );
}

