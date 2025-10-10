const stats = [
  { label: 'Communities thriving', value: '168+' },
  { label: 'Creators monetising', value: '12k+' },
  { label: 'Average retention lift', value: '38%' },
  { label: 'Daily knowledge exchanges', value: '54k' }
];

export default function StatsBar() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-2">
            <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
