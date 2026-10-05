import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import RadioGroupChoiceCard from "../../src/registry/kobalte/examples/docs/radio-group-choice-card";
import RadioGroupDemo from "../../src/registry/kobalte/examples/docs/radio-group-demo";
import { Label } from "../../src/registry/kobalte/ui/label";
import { RadioGroup, RadioGroupItem } from "../../src/registry/kobalte/ui/radio-group";
import "../../src/styles.css";

const params = new URLSearchParams(location.search);
document.documentElement.classList.toggle("dark", params.get("theme") === "dark");
document.body.className = `style-${params.get("style") || "vega"}`;

function Fixture() {
  const [value, setValue] = createSignal("first");
  const [submitted, setSubmitted] = createSignal("");
  const [changes, setChanges] = createSignal(0);
  const controlled = params.get("mode") === "controlled";
  return (
    <main style={{ padding: "32px", display: "grid", gap: "32px" }}>
      <section aria-label="Docs demo">
        <RadioGroupDemo />
      </section>
      <section aria-label="Choice cards">
        <RadioGroupChoiceCard />
      </section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(String(new FormData(event.currentTarget).get("choice")));
        }}
      >
        <RadioGroup
          name="choice"
          disabled={params.has("disabled")}
          readOnly={params.has("readonly")}
          {...(controlled ? { value: value() } : { defaultValue: "first" })}
          onChange={(next) => {
            setValue(next);
            setChanges((count) => count + 1);
          }}
        >
          <div class="flex items-center gap-3">
            <RadioGroupItem value="first" id="first" />
            <Label for="first">First</Label>
          </div>
          <div class="flex items-center gap-3">
            <RadioGroupItem value="disabled" id="disabled" disabled />
            <Label for="disabled">Disabled item</Label>
          </div>
          <div class="flex items-center gap-3">
            <RadioGroupItem value="last" id="last" />
            <Label for="last">Last</Label>
          </div>
        </RadioGroup>
        <button type="submit">Submit</button>
        <output aria-label="Submitted value">{submitted()}</output>
        <output aria-label="Change count">{changes()}</output>
      </form>
    </main>
  );
}

const root = document.getElementById("root");
if (root) render(() => <Fixture />, root);
