import { createSignal } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Switch } from "@/registry/ui/switch";

export default function SwitchExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1">
      <SwitchDemo />
      <SwitchDisabled />
      <SwitchControlled />
    </ExampleWrapper>
  );
}

function SwitchDemo() {
  return (
    <Example title="Basic">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <div class="flex items-center gap-2">
          <Switch id="airplane-mode" />
          <label for="airplane-mode" class="cursor-pointer text-sm">
            Airplane Mode
          </label>
        </div>
        <div class="flex items-center gap-2">
          <Switch id="wifi" />
          <label for="wifi" class="cursor-pointer text-sm">
            WiFi
          </label>
        </div>
        <div class="flex items-center gap-2">
          <Switch id="bluetooth" />
          <label for="bluetooth" class="cursor-pointer text-sm">
            Bluetooth
          </label>
        </div>
      </div>
    </Example>
  );
}

function SwitchDisabled() {
  return (
    <Example title="Disabled">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <div class="flex items-center gap-2">
          <Switch id="disabled-off" disabled />
          <label for="disabled-off" class="cursor-not-allowed text-muted-foreground text-sm">
            Disabled (off)
          </label>
        </div>
        <div class="flex items-center gap-2">
          <Switch id="disabled-on" disabled checked />
          <label for="disabled-on" class="cursor-not-allowed text-muted-foreground text-sm">
            Disabled (on)
          </label>
        </div>
      </div>
    </Example>
  );
}

function SwitchControlled() {
  const [checked, setChecked] = createSignal(false);

  return (
    <Example title="Controlled">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <div class="flex items-center gap-2">
          <Switch id="controlled" checked={checked()} onChange={setChecked} />
          <label for="controlled" class="cursor-pointer text-sm">
            Notifications {checked() ? "enabled" : "disabled"}
          </label>
        </div>
        <p class="text-muted-foreground text-xs">
          Current state: <code class="rounded bg-muted px-1">{String(checked())}</code>
        </p>
      </div>
    </Example>
  );
}
