import { createSignal } from "solid-js";
import { toast } from "solid-sonner";
import { z } from "zod";
import { Questionnaire } from "@/registry/kobalte/blocks/questionnaire";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/registry/kobalte/ui/card";
import { Toaster } from "@/registry/kobalte/ui/toast";

const items = [
  { name: "detail", required: true },
  { name: "audience", required: true },
] as const;

const questionnaireSchema = z
  .object({
    detail: z.enum(["summary", "complete"]),
    audience: z.enum(["team", "public"]),
  })
  .superRefine((answers, context) => {
    if (answers.audience === "public" && answers.detail === "summary") {
      context.addIssue({
        code: "custom",
        message: "Public answers need enough context. Choose a complete answer.",
        path: ["detail"],
      });
    }
  });

type QuestionnaireItemName = keyof z.infer<typeof questionnaireSchema>;
type QuestionnaireErrors = Partial<Record<QuestionnaireItemName, string>>;

function ValidationProgress() {
  return (
    <Questionnaire.Progress class="min-w-0">
      {(state) => (
        <>
          {state.current} / {state.total}
        </>
      )}
    </Questionnaire.Progress>
  );
}

export default function QuestionnaireValidation() {
  const [item, setItem] = createSignal("detail");
  const [errors, setErrors] = createSignal<QuestionnaireErrors>({});

  function clearError(name: QuestionnaireItemName) {
    setErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();

    const result = questionnaireSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );

    if (result.success) {
      setErrors({});
      toast("Agent response configured", {
        description: `Detail: ${result.data.detail} · Audience: ${result.data.audience}`,
      });
      return;
    }

    const nextErrors: QuestionnaireErrors = {};

    for (const issue of result.error.issues) {
      const name = issue.path[0];

      if ((name === "detail" || name === "audience") && !nextErrors[name]) {
        nextErrors[name] = issue.message;
      }
    }

    const firstInvalidItem = result.error.issues[0]?.path[0];

    setErrors(nextErrors);

    if (firstInvalidItem === "detail" || firstInvalidItem === "audience") {
      setItem(firstInvalidItem);
    }
  }

  return (
    <>
      <Toaster />
      <Questionnaire.Root
        class="mx-auto max-w-md"
        item={item()}
        items={items}
        onItemChange={setItem}
        onSubmit={handleSubmit}
      >
        <Card class="w-full">
          <Questionnaire.Item invalid={Boolean(errors().detail)} name="detail" required>
            <CardHeader>
              <Questionnaire.Title>How much detail should the answer include?</Questionnaire.Title>
              <Questionnaire.Description>Choose the response depth.</Questionnaire.Description>
              <CardAction>
                <ValidationProgress />
              </CardAction>
            </CardHeader>
            <CardContent>
              <Questionnaire.Choices>
                <Questionnaire.Choice value="summary" onChange={() => clearError("detail")}>
                  Concise summary
                </Questionnaire.Choice>
                <Questionnaire.Choice value="complete" onChange={() => clearError("detail")}>
                  Complete answer
                </Questionnaire.Choice>
              </Questionnaire.Choices>
              <Questionnaire.Error>{errors().detail}</Questionnaire.Error>
            </CardContent>
          </Questionnaire.Item>

          <Questionnaire.Item invalid={Boolean(errors().audience)} name="audience" required>
            <CardHeader>
              <Questionnaire.Title>Who will read the answer?</Questionnaire.Title>
              <Questionnaire.Description>
                Public answers require complete context.
              </Questionnaire.Description>
              <CardAction>
                <ValidationProgress />
              </CardAction>
            </CardHeader>
            <CardContent>
              <Questionnaire.Choices>
                <Questionnaire.Choice value="team" onChange={() => clearError("audience")}>
                  My team
                </Questionnaire.Choice>
                <Questionnaire.Choice value="public" onChange={() => clearError("audience")}>
                  Public audience
                </Questionnaire.Choice>
              </Questionnaire.Choices>
              <Questionnaire.Error>{errors().audience}</Questionnaire.Error>
            </CardContent>
          </Questionnaire.Item>

          <CardFooter>
            <Questionnaire.Actions>
              <Questionnaire.Previous />
              <Questionnaire.Next>Next</Questionnaire.Next>
              <Questionnaire.Submit>Validate answers</Questionnaire.Submit>
            </Questionnaire.Actions>
          </CardFooter>
        </Card>
      </Questionnaire.Root>
    </>
  );
}
