import { toast } from "solid-sonner";
import { Questionnaire } from "@/registry/kobalte/blocks/questionnaire";
import { Button } from "@/registry/kobalte/ui/button";
import { Toaster } from "@/registry/kobalte/ui/toast";

const items = [
  { name: "change", required: true },
  { name: "verification", required: true },
  { name: "notes" },
] as const;

export default function QuestionnaireResume() {
  function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const answers = {
      change: formData.get("change"),
      verification: formData.getAll("verification"),
      notes: formData.get("notes"),
    };

    toast("Draft updated", {
      description: `Migration: ${answers.change ?? "None"} · Verification: ${answers.verification.join(", ") || "None"} · Notes: ${answers.notes || "None"}`,
    });
  }

  return (
    <>
      <Toaster />
      <Questionnaire.Root
        class="mx-auto max-w-md"
        defaultItem="verification"
        items={items}
        onReset={() => toast("Saved answers restored")}
        onSubmit={handleSubmit}
      >
        <Questionnaire.Progress />

        <Questionnaire.Item name="change" required>
          <Questionnaire.Title>What kind of migration is this?</Questionnaire.Title>
          <Questionnaire.Description>
            This answer was saved during the previous session.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="incremental" defaultChecked>
              Incremental migration
            </Questionnaire.Choice>
            <Questionnaire.Choice value="cutover">Single cutover</Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Item name="verification" multiple required>
          <Questionnaire.Title>How should the migration be verified?</Questionnaire.Title>
          <Questionnaire.Description>
            These checks were selected during the previous session.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="tests" defaultChecked>
              Run migration tests
            </Questionnaire.Choice>
            <Questionnaire.Choice value="typecheck" defaultChecked>
              Run the typecheck
            </Questionnaire.Choice>
            <Questionnaire.Choice value="manual">Perform a manual smoke test</Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Item name="notes">
          <Questionnaire.Title>Anything else the agent should remember?</Questionnaire.Title>
          <Questionnaire.Description>This note was saved with the draft.</Questionnaire.Description>
          <Questionnaire.Input
            aria-label="Saved migration note"
            defaultValue="Keep the existing public API stable."
          />
        </Questionnaire.Item>

        <Questionnaire.Actions>
          <Button type="reset" variant="outline">
            Reset changes
          </Button>
          <Questionnaire.Previous />
          <Questionnaire.Next>Next</Questionnaire.Next>
          <Questionnaire.Submit>Update draft</Questionnaire.Submit>
        </Questionnaire.Actions>
      </Questionnaire.Root>
    </>
  );
}
