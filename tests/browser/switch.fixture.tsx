import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { Switch } from "../../src/registry/kobalte/ui/switch";
import "../../src/styles.css";

const params = new URLSearchParams(location.search);
document.documentElement.classList.toggle("dark", params.get("theme") === "dark");
document.body.className = `style-${params.get("style") || "vega"}`;

function Fixture() {
  const [checked, setChecked] = createSignal(false);
  const size = params.get("size") === "sm" ? "sm" : "default";
  const controlled = params.get("mode") === "controlled";
  return (
    <main style={{ padding: "32px", display: "grid", gap: "24px" }}>
      <label for="airplane">Airplane Mode</label>
      <Switch
        id="airplane"
        size={size}
        {...(controlled ? { checked: checked(), onChange: setChecked } : {})}
      />
      <label for="disabled">Disabled</label>
      <Switch id="disabled" size={size} disabled />
      <label for="disabled-checked">Disabled checked</label>
      <Switch id="disabled-checked" size={size} disabled defaultChecked />
    </main>
  );
}

const root = document.getElementById("root");
if (root) render(() => <Fixture />, root);
