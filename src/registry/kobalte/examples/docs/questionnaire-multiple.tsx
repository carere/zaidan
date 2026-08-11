import { toast } from "solid-sonner";
import { Questionnaire } from "@/registry/kobalte/blocks/questionnaire";
import { Toaster } from "@/registry/kobalte/ui/toast";

const items = [
  {
    choices: [{ value: "source" }, { value: "tests" }, { value: "docs" }, { value: "history" }],
    name: "context",
    required: true,
  },
] as const;

export default function QuestionnaireMultiple() {
  function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();

    const context = new FormData(event.currentTarget).getAll("context");

    toast("Context selected", {
      description: `Context: ${context.join(", ") || "None"}`,
    });
  }

  return (
    <>
      <Toaster />
      <Questionnaire.Root
        class="mx-auto max-w-md"
        items={items}
        shortcuts="letters"
        onSubmit={handleSubmit}
      >
        <Questionnaire.Item name="context" multiple required>
          <Questionnaire.Title>What context should the agent inspect?</Questionnaire.Title>
          <Questionnaire.Description>
            Select every source that may affect the implementation.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="source">Relevant source files</Questionnaire.Choice>
            <Questionnaire.Choice value="tests">Existing tests</Questionnaire.Choice>
            <Questionnaire.Choice value="docs">Architecture documentation</Questionnaire.Choice>
            <Questionnaire.Choice value="history">Recent commit history</Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Actions>
          <Questionnaire.Submit>Share context</Questionnaire.Submit>
        </Questionnaire.Actions>
      </Questionnaire.Root>
    </>
  );
}
