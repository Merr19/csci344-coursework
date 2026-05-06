import { useEffect, useState } from "react";
import { getItems, createItem, updateItem, deleteItem } from "../api.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { FaGamepad, FaPlus, FaUser, FaChartBar } from "react-icons/fa";

const emptyForm = {
  title: "",
  image_url: "",
  rating: "",
  status: "",
  notes: "",
};

export default function Homepage({ username }) {
  const [mode, setMode] = useState("home");
  const [games, setGames] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    try {
      const data = await getItems();
      setGames(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      setError(err.message);
    }
  }

  function startCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setMode("upload");
    setError("");
  }

  function startEdit(game) {
    setForm({
      title: game.title || "",
      image_url: game.image_url || "",
      rating: game.rating || "",
      status: game.status || "",
      notes: game.notes || "",
    });

    setEditingId(game.id);
    setMode("upload");
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const payload = {
      ...form,
      rating: form.rating ? Number(form.rating) : null,
    };

    try {
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }

      setForm(emptyForm);
      setEditingId(null);
      setMode("home");
      await loadGames();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this game?");
    if (!confirmed) return;

    try {
      await deleteItem(id);
      await loadGames();
    } catch (err) {
      setError(err.message);
    }
  }

  const groupedGames = {};

  games.forEach((game) => {
    const cleanTitle = (game.title || "").trim().toLowerCase();

    if (!cleanTitle) return;

    if (!groupedGames[cleanTitle]) {
      groupedGames[cleanTitle] = {
        title: game.title,
        totalRating: 0,
        count: 0,
      };
    }

    groupedGames[cleanTitle].totalRating += Number(game.rating || 0);
    groupedGames[cleanTitle].count += 1;
  });

  const chartData = Object.values(groupedGames).map((game) => ({
    title: game.title,
    rating: Number((game.totalRating / game.count).toFixed(1)),
  }));

  const averageRating =
    games.length > 0
      ? (
          games.reduce((sum, game) => sum + Number(game.rating || 0), 0) /
          games.length
        ).toFixed(1)
      : "0";

  return (
    <main className="mx-auto mt-6 max-w-6xl border bg-gray-200">
      <div className="flex justify-around border-b bg-white p-3 font-semibold">
        <button onClick={() => setMode("home")} className="flex items-center gap-2">
          <FaGamepad /> Home
        </button>

        <button onClick={() => setMode("chart")} className="flex items-center gap-2">
          <FaChartBar /> Bar Graph
        </button>

        <button onClick={startCreate} className="flex items-center gap-2">
          <FaPlus /> Upload
        </button>

        <button onClick={() => setMode("profile")} className="flex items-center gap-2">
          <FaUser /> Profile
        </button>
      </div>

      {error && <p className="m-4 text-red-600">{error}</p>}

      {mode === "home" && (
        <section className="p-6">
          <h2 className="mb-4 text-2xl font-bold">My Games</h2>

          {games.length === 0 ? (
            <p>No games yet. Click Upload to add one.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {games.map((game) => (
                <article key={game.id} className="border bg-white p-3 shadow-sm">
                  <img
                    src={game.image_url || "https://placehold.co/300x400"}
                    alt={game.title}
                    className="h-44 w-full object-cover"
                  />

                  <h3 className="mt-2 font-bold">{game.title}</h3>
                  <p>Rating: {game.rating || "N/A"}</p>
                  <p>Status: {game.status}</p>

                  {game.notes && (
                    <p className="mt-2 text-sm text-gray-700">{game.notes}</p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => startEdit(game)}
                      className="border bg-gray-100 px-2 py-1"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(game.id)}
                      className="border bg-gray-100 px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {mode === "upload" && (
        <section className="p-6">
          <h2 className="mb-4 text-2xl font-bold">
            {editingId ? "Edit Game" : "Upload Game"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="w-full border p-2"
              placeholder="Game title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <input
              className="w-full border p-2"
              placeholder="Image URL"
              value={form.image_url}
              onChange={(e) =>
                setForm({ ...form, image_url: e.target.value })
              }
            />

            <input
              className="w-full border p-2"
              type="number"
              min="1"
              max="10"
              placeholder="Rating 1-10"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
            />

            <select
              className="w-full border p-2"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              required
            >
              <option value="">Choose status</option>
              <option value="Playing">Playing</option>
              <option value="Completed">Completed</option>
              <option value="Backlog">Backlog</option>
              <option value="Wishlist">Wishlist</option>
            </select>

            <textarea
              className="w-full border p-2"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="flex gap-2">
              <button className="bg-black px-4 py-2 text-white">
                {editingId ? "Update Game" : "Upload Game"}
              </button>

              <button
                type="button"
                onClick={() => setMode("home")}
                className="border bg-white px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {mode === "chart" && (
        <section className="p-6">
          <h2 className="mb-1 text-2xl font-bold">Overall Game Ratings</h2>
          <p className="mb-4 text-sm text-gray-700">
            Games with the same title are combined into one average rating.
          </p>

          {chartData.length === 0 ? (
            <p>No games to chart yet.</p>
          ) : (
            <div className="h-80 rounded border bg-white p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="title" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Bar dataKey="rating">
                    {chartData.map((entry, index) => {
                      const colors = [
                        "#ef4444",
                        "#f97316",
                        "#eab308",
                        "#22c55e",
                        "#3b82f6",
                        "#8b5cf6",
                        "#ec4899",
                      ];

                    return (
                      <cell
                        key={`cell-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    );
                  })}
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {mode === "profile" && (
        <section className="p-6">
          <h2 className="text-2xl font-bold">Profile</h2>
          <p className="mt-2">Logged in as: {username}</p>
          <p>Games added: {games.length}</p>
          <p>Average rating: {averageRating}</p>
        </section>
      )}
    </main>
  );
}