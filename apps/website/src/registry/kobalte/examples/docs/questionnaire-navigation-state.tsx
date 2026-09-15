import { toast } from "solid-sonner";
import { Questionnaire, useQuestionnaire } from "@/registry/kobalte/blocks/questionnaire";
import { Toaster } from "@/registry/kobalte/ui/toast";

const items = [
  { name: "permission", required: true },
  { name: "verification", required: true },
] as const;

function NavigationActions() {
  const state = useQuestionnaire();
  const unanswered = () => state.activeItemStatus === "unanswered";

  return (
    <Questionnaire.Actions>
      <Questionnaire.Previous />
      <Questionnaire.Next
        class="data-[status=unanswered]:opacity-50"
        disabled={unanswered()}
        variant="secondary"
      >
        Next ({state.current} of {state.total})
      </Questionnaire.Next>
      <Questionnaire.Submit disabled={unanswered()}>Save permissions</Questionnaire.Submit>
    </Questionnaire.Actions>
  );
}

export default function QuestionnaireNavigationState() {
  function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    toast("Permissions saved", {
      description: `Permission: ${formData.get("permission") ?? "None"} · Verification: ${formData.get("verification") ?? "None"}`,
    });
  }

  return (
    <>
      <Toaster />
      <Questionnaire.Root
        class="mx-auto max-w-md"
        defaultItem="permission"
        items={items}
        onSubmit={handleSubmit}
      >
        <Questionnaire.Progress />

        <Questionnaire.Item name="permission" required>
          <Questionnaire.Title>What may the agent modify?</Questionnaire.Title>
          <Questionnaire.Description>
            Next is disabled until useQuestionnaire() reports the active item as answered.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="files">Project files</Questionnaire.Choice>
            <Questionnaire.Choice value="tests">Project files and tests</Questionnaire.Choice>
            <Questionnaire.Choice value="config">
              Files, tests, and configuration
            </Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Item name="verification" required>
          <Questionnaire.Title>What must pass before completion?</Questionnaire.Title>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="tests">Tests</Questionnaire.Choice>
            <Questionnaire.Choice value="types">Tests and types</Questionnaire.Choice>
            <Questionnaire.Choice value="all">Tests, types, and visual QA</Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <NavigationActions />
      </Questionnaire.Root>
    </>
  );
}
