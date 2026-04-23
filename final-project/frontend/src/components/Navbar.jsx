export default function Navbar({ handleLogout, username }) {
  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <h1 className="text-base font-semibold">Final Project</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">
          {username ? `Signed in as ${username}` : "Signed in"}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
