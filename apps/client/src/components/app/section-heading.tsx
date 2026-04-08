type Props = {
  title: string;
  desc?: string;
  right?: React.ReactNode;
};

export function SectionHeading({ title, desc, right }: Props) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {desc ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{desc}</p> : null}
      </div>
      {right}
    </div>
  );
}

