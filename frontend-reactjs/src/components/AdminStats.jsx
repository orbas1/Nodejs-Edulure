const tiles = [
  {
    title: 'Active subscriptions',
    value: '1,982',
    delta: '+12% MoM'
  },
  {
    title: 'Communities launched',
    value: '168',
    delta: '+8 new this week'
  },
  {
    title: 'Support satisfaction',
    value: '96%',
    delta: 'Avg. 1.2h response'
  }
];

export default function AdminStats() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {tiles.map((tile) => (
        <div key={tile.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500">{tile.title}</h3>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{tile.value}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-primary">{tile.delta}</p>
        </div>
      ))}
    </div>
  );
}
