import { render } from "solid-js/web";
import DataGridDemo from "@/registry/kobalte/examples/docs/data-grid-demo";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Data Grid fixture root is missing");

const constrained = new URLSearchParams(location.search).has("constrained");
render(
  () => (
    <>
      <style>{`
        body { margin: 0; width: 1800px; }
        main { margin: 200px; width: 500px; }
        ${constrained ? '[data-slot="data-grid-scroll-area"] { height: 100px; }' : ""}
      `}</style>
      <main>
        <DataGridDemo />
      </main>
      <div style={{ height: "1800px" }} />
    </>
  ),
  root,
);
