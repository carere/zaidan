import { createSignal } from "solid-js";
import { toast } from "solid-sonner";
import { Questionnaire } from "@/registry/kobalte/blocks/questionnaire";
import { Toaster } from "@/registry/kobalte/ui/toast";

const items = [
  { name: "scope", required: true },
  { name: "checks", required: true },
  { name: "output", required: true },
] as const;

const itemLabels: Record<string, string> = {
  scope: "Change scope",
  checks: "Verification",
  output: "Final output",
};

export default function QuestionnaireControlled() {
  const [item, setItem] = createSignal("scope");

  function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    toast("Agent workflow configured", {
      description: `Scope: ${formData.get("scope") ?? "None"} · Verification: ${formData.get("checks") ?? "None"} · Output: ${formData.get("output") ?? "None"}`,
    });
  }

  return (
    <div class="relative mx-auto flex h-full w-full max-w-md flex-col">
      <Toaster />
      <p class="absolute end-0 top-0 text-muted-foreground text-sm" role="status">
        Current checkpoint: {itemLabels[item()]}
      </p>

      <Questionnaire.Root
        class="mt-auto"
        item={item()}
        items={items}
        onItemChange={setItem}
        onSubmit={handleSubmit}
      >
        <Questionnaire.Progress />

        <Questionnaire.Item name="scope" required>
          <Questionnaire.Title>What may the agent change?</Questionnaire.Title>
          <Questionnaire.Description>
            The host stores the active checkpoint while Questionnaire navigates.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="component">Only the target component</Questionnaire.Choice>
            <Questionnaire.Choice value="tests">Component and related tests</Questionnaire.Choice>
            <Questionnaire.Choice value="feature">The complete feature area</Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Item name="checks" required>
          <Questionnaire.Title>Which verification level should it use?</Questionnaire.Title>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="targeted">Targeted tests</Questionnaire.Choice>
            <Questionnaire.Choice value="package">Package tests and typecheck</Questionnaire.Choice>
            <Questionnaire.Choice value="full">Full workspace verification</Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Item name="output" required>
          <Questionnaire.Title>What should the agent return when finished?</Questionnaire.Title>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="summary">Concise summary</Questionnaire.Choice>
            <Questionnaire.Choice value="diff">Summary with changed files</Questionnaire.Choice>
            <Questionnaire.Choice value="handoff">
              Detailed implementation handoff
            </Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Actions>
          <Questionnaire.Previous />
          <Questionnaire.Next>Next</Questionnaire.Next>
          <Questionnaire.Submit>Save workflow</Questionnaire.Submit>
        </Questionnaire.Actions>
      </Questionnaire.Root>
    </div>
  );
}
