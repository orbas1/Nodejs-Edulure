export default function FormField({ label, type = 'text', name, placeholder, required = true, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      {children ? (
        children
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          required={required}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      )}
    </label>
  );
}
