import { createMemo, createSignal } from "solid-js";
import { toast } from "solid-sonner";
import { Questionnaire } from "@/registry/kobalte/blocks/questionnaire";
import { Toaster } from "@/registry/kobalte/ui/toast";

export default function QuestionnaireConditional() {
  const [runtime, setRuntime] = createSignal("local");
  const items = createMemo(
    () =>
      [
        { name: "runtime", required: true },
        {
          disabled: runtime() !== "cloud",
          name: "environment",
          required: true,
        },
        { name: "approval", required: true },
      ] as const,
  );

  function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    toast("Execution plan saved", {
      description: `Runtime: ${formData.get("runtime") ?? "None"} · Environment: ${formData.get("environment") ?? "Not applicable"} · Approval: ${formData.get("approval") ?? "None"}`,
    });
  }

  return (
    <>
      <Toaster />
      <Questionnaire.Root
        class="mx-auto max-w-md"
        defaultItem="runtime"
        items={items()}
        onSubmit={handleSubmit}
      >
        <Questionnaire.Progress />

        <Questionnaire.Item name="runtime" required>
          <Questionnaire.Title>Where should the agent run?</Questionnaire.Title>
          <Questionnaire.Description>
            Cloud runs add an environment question to this flow.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice
              checked={runtime() === "local"}
              value="local"
              onChange={() => setRuntime("local")}
            >
              Local workspace
            </Questionnaire.Choice>
            <Questionnaire.Choice
              checked={runtime() === "cloud"}
              value="cloud"
              onChange={() => setRuntime("cloud")}
            >
              Cloud workspace
            </Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Item disabled={runtime() !== "cloud"} name="environment" required>
          <Questionnaire.Title>Which cloud environment should it use?</Questionnaire.Title>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="preview">Preview</Questionnaire.Choice>
            <Questionnaire.Choice value="staging">Staging</Questionnaire.Choice>
            <Questionnaire.Choice value="isolated">Isolated sandbox</Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Item name="approval" required>
          <Questionnaire.Title>When should the agent request approval?</Questionnaire.Title>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="writes">Before writing files</Questionnaire.Choice>
            <Questionnaire.Choice value="commands">Before running commands</Questionnaire.Choice>
            <Questionnaire.Choice value="sensitive">
              Only for sensitive actions
            </Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Actions>
          <Questionnaire.Previous />
          <Questionnaire.Next>Next</Questionnaire.Next>
          <Questionnaire.Submit>Save execution plan</Questionnaire.Submit>
        </Questionnaire.Actions>
      </Questionnaire.Root>
    </>
  );
}
