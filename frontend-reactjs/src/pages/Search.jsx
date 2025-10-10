import SearchBar from '../components/SearchBar.jsx';

const results = [
  {
    type: 'Community',
    title: 'AI Builders Guild',
    description: 'Advanced experimentation hub for AI-first educators.',
    members: '3.2k members'
  },
  {
    type: 'Lesson',
    title: 'Designing retention-first onboarding',
    description: 'Workshop replay and templates to scale member activation.',
    members: '4.8 ★ rating'
  },
  {
    type: 'Instructor',
    title: 'Sasha Flores',
    description: 'Teaches monetization systems for private communities.',
    members: 'Available for 1:1s'
  }
];

export default function Search() {
  return (
    <section className="bg-slate-50/70 py-16">
      <div className="mx-auto max-w-5xl space-y-10 px-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Search the Edulure universe</h1>
          <p className="mt-3 text-sm text-slate-600">
            Powered by Meilisearch for lightning-fast discovery across communities, lessons, resources, and talent.
          </p>
        </div>
        <SearchBar placeholder="Try “conversion playbook” or “community design”" />
        <div className="grid gap-6">
          {results.map((result) => (
            <div key={result.title} className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
              <div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {result.type}
                </span>
                <h2 className="mt-4 text-xl font-semibold text-slate-900">{result.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{result.description}</p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <span className="text-sm font-semibold text-primary">{result.members}</span>
                <button className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-primary hover:text-primary">
                  View details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
