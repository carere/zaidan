import { toast } from "solid-sonner";
import { Questionnaire } from "@/registry/kobalte/blocks/questionnaire";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/registry/kobalte/ui/card";
import { Toaster } from "@/registry/kobalte/ui/toast";

const items = [
  {
    choices: [{ value: "fix" }, { value: "refactor" }, { value: "docs" }],
    name: "task",
    required: true,
  },
  {
    choices: [{ value: "summary" }, { value: "files" }, { value: "review" }],
    name: "output",
    required: true,
  },
] as const;

export default function QuestionnaireCard() {
  function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    toast("Agent task created", {
      description: `Task: ${formData.get("task") ?? "None"} · Handoff: ${formData.get("output") ?? "None"}`,
    });
  }

  return (
    <>
      <Toaster />
      <Questionnaire.Root
        class="mx-auto max-w-md"
        defaultItem="task"
        items={items}
        shortcuts="numbers"
        onSubmit={handleSubmit}
      >
        <Card>
          <Questionnaire.Item name="task" required>
            <CardHeader>
              <Questionnaire.Title class="z-card-title z-font-heading">
                What should the agent work on?
              </Questionnaire.Title>
              <Questionnaire.Description class="z-card-description">
                Choose the task that should be handled next.
              </Questionnaire.Description>
              <CardAction>
                <Questionnaire.Progress />
              </CardAction>
            </CardHeader>
            <CardContent>
              <Questionnaire.Choices>
                <Questionnaire.Choice value="fix">Fix the failing tests</Questionnaire.Choice>
                <Questionnaire.Choice value="refactor">
                  Refactor the data layer
                </Questionnaire.Choice>
                <Questionnaire.Choice value="docs">
                  Update the integration guide
                </Questionnaire.Choice>
              </Questionnaire.Choices>
              <Questionnaire.Error />
            </CardContent>
          </Questionnaire.Item>

          <Questionnaire.Item name="output" required>
            <CardHeader>
              <Questionnaire.Title class="z-card-title z-font-heading">
                What should the final handoff include?
              </Questionnaire.Title>
              <Questionnaire.Description class="z-card-description">
                Pick the level of detail needed for review.
              </Questionnaire.Description>
              <CardAction>
                <Questionnaire.Progress />
              </CardAction>
            </CardHeader>
            <CardContent>
              <Questionnaire.Choices>
                <Questionnaire.Choice value="summary">Summary only</Questionnaire.Choice>
                <Questionnaire.Choice value="files">Summary and changed files</Questionnaire.Choice>
                <Questionnaire.Choice value="review">Full review handoff</Questionnaire.Choice>
              </Questionnaire.Choices>
              <Questionnaire.Error />
            </CardContent>
          </Questionnaire.Item>

          <CardFooter>
            <Questionnaire.Actions class="w-full">
              <Questionnaire.Previous />
              <Questionnaire.Next>Next</Questionnaire.Next>
              <Questionnaire.Submit>Create task</Questionnaire.Submit>
            </Questionnaire.Actions>
          </CardFooter>
        </Card>
      </Questionnaire.Root>
    </>
  );
}
