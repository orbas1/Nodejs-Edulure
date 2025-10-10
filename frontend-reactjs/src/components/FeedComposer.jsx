export default function FeedComposer() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <img
          src="https://i.pravatar.cc/100?img=5"
          alt="Your avatar"
          className="h-10 w-10 rounded-full"
        />
        <button className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-left text-sm text-slate-500 transition hover:border-primary hover:text-primary">
          Share something with your communities...
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1">Live session</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Upload lesson</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Poll members</span>
      </div>
    </div>
  );
}
