import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <div class="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900">
      Hello World
    </div>
  );
}
