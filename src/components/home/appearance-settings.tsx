import { MinusIcon, PlusIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroup } from "@/registry/kobalte/ui/button-group";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import { RadioGroup, RadioGroupItem } from "@/registry/kobalte/ui/radio-group";
import { Switch } from "@/registry/kobalte/ui/switch";

export default function AppearanceSettings() {
  const [gpuCount, setGpuCount] = createSignal(8);

  const handleGpuAdjustment = (adjustment: number) => {
    setGpuCount((prevCount) => Math.max(1, Math.min(99, prevCount + adjustment)));
  };

  const handleGpuInputChange = (e: Event & { currentTarget: HTMLInputElement }) => {
    const value = parseInt(e.currentTarget.value, 10);
    if (!Number.isNaN(value) && value >= 1 && value <= 99) {
      setGpuCount(value);
    }
  };

  return (
    <FieldSet>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Compute Environment</FieldLegend>
          <FieldDescription>Select the compute environment for your cluster.</FieldDescription>
          <RadioGroup defaultValue="kubernetes">
            <FieldLabel for="kubernetes-r2h">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Kubernetes</FieldTitle>
                  <FieldDescription>
                    Run GPU workloads on a K8s configured cluster. This is the default.
                  </FieldDescription>
                </FieldContent>
                <RadioGroupItem value="kubernetes" id="kubernetes-r2h" aria-label="Kubernetes" />
              </Field>
            </FieldLabel>
            <FieldLabel for="vm-z4k">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Virtual Machine</FieldTitle>
                  <FieldDescription>
                    Access a VM configured cluster to run workloads. (Coming soon)
                  </FieldDescription>
                </FieldContent>
                <RadioGroupItem value="vm" id="vm-z4k" aria-label="Virtual Machine" />
              </Field>
            </FieldLabel>
          </RadioGroup>
        </FieldSet>
        <FieldSeparator />
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel for="number-of-gpus-f6l">Number of GPUs</FieldLabel>
            <FieldDescription>You can add more later.</FieldDescription>
          </FieldContent>
          <ButtonGroup>
            <Input
              id="number-of-gpus-f6l"
              value={gpuCount()}
              onInput={handleGpuInputChange}
              size={3}
              class="h-7 w-14! font-mono"
              maxLength={3}
            />
            <Button
              variant="outline"
              size="icon-sm"
              type="button"
              aria-label="Decrement"
              onClick={() => handleGpuAdjustment(-1)}
              disabled={gpuCount() <= 1}
            >
              <MinusIcon />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              type="button"
              aria-label="Increment"
              onClick={() => handleGpuAdjustment(1)}
              disabled={gpuCount() >= 99}
            >
              <PlusIcon />
            </Button>
          </ButtonGroup>
        </Field>
        <FieldSeparator />
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel for="tinting">Wallpaper Tinting</FieldLabel>
            <FieldDescription>Allow the wallpaper to be tinted.</FieldDescription>
          </FieldContent>
          <Switch id="tinting" defaultChecked />
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
