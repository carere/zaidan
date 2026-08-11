import { createSignal } from "solid-js";
import { toast } from "solid-sonner";
import {
  Questionnaire,
  type QuestionnaireItemStatus,
} from "@/registry/kobalte/blocks/questionnaire";
import { Toaster } from "@/registry/kobalte/ui/toast";

const items = [
  { name: "task", required: true },
  { name: "constraints" },
  { name: "review", required: true },
] as const;

export default function QuestionnaireSkipDemo() {
  const [constraintStatus, setConstraintStatus] =
    createSignal<QuestionnaireItemStatus>("unanswered");

  function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const answers = {
      task: formData.get("task"),
      constraints: formData.get("constraints"),
      constraintStatus: constraintStatus(),
      review: formData.get("review"),
    };

    toast("Agent brief submitted", {
      description: `Task: ${answers.task ?? "None"} · Constraints: ${
        answers.constraintStatus === "skipped" ? "Skipped" : (answers.constraints ?? "None")
      } · Review: ${answers.review ?? "None"}`,
    });
  }

  return (
    <>
      <Toaster />
      <Questionnaire.Root
        class="mx-auto max-w-md"
        defaultItem="task"
        items={items}
        onSubmit={handleSubmit}
      >
        <Questionnaire.Progress />

        <Questionnaire.Item name="task" required>
          <Questionnaire.Title>What kind of change is this?</Questionnaire.Title>
          <Questionnaire.Description>
            Choose the category that best describes the work.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="feature">New feature</Questionnaire.Choice>
            <Questionnaire.Choice value="fix">Bug fix</Questionnaire.Choice>
            <Questionnaire.Choice value="refactor">Refactor</Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Item name="constraints" onStatusChange={setConstraintStatus}>
          <Questionnaire.Title>Are there any implementation constraints?</Questionnaire.Title>
          <Questionnaire.Description>
            Answer if needed, or intentionally skip this question.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="no-dependencies">
              Do not add dependencies
            </Questionnaire.Choice>
            <Questionnaire.Choice value="no-migrations">
              Do not change the database
            </Questionnaire.Choice>
            <Questionnaire.Choice value="preserve-api">
              Preserve the public API
            </Questionnaire.Choice>
            <Questionnaire.Input
              aria-label="Another implementation constraint"
              placeholder="Describe another constraint…"
            />
          </Questionnaire.Choices>
        </Questionnaire.Item>

        <Questionnaire.Item name="review" required>
          <Questionnaire.Title>How should the work be reviewed?</Questionnaire.Title>
          <Questionnaire.Description>
            Choose the checks the agent should complete before handoff.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="tests">Run the test suite</Questionnaire.Choice>
            <Questionnaire.Choice value="diff">Review the final diff</Questionnaire.Choice>
            <Questionnaire.Choice value="both">Tests and diff review</Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Actions>
          <Questionnaire.Previous />
          <Questionnaire.Skip />
          <Questionnaire.Next>Next</Questionnaire.Next>
          <Questionnaire.Submit>Submit brief</Questionnaire.Submit>
        </Questionnaire.Actions>
      </Questionnaire.Root>
    </>
  );
}
