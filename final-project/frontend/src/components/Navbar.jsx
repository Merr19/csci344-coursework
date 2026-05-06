export default function Navbar({ handleLogout, username }) {
  return (
    <nav className="flex justify-between p-4 bg-white border-b">
      <h1 className="font-bold text-xl">Memorycard</h1>

      <div className="flex gap-4 items-center">
        <span>{username}</span>

        <button
          onClick={handleLogout}
          className="border px-3 py-1"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
