import React from "react";
import BarChart from "./BarChart";

export default function Homepage({ username }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <section className="rounded border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold">Your app goes here</h1>
        {username ? (
          <p className="mt-2 text-sm text-slate-500">Logged in as {username}</p>
        ) : null}

        <BarChart />
      </section>
    </main>
  );
}
