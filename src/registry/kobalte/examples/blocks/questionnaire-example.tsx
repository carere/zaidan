import { toast } from "solid-sonner";
import { Example, ExampleWrapper } from "@/components/example";
import { Questionnaire } from "@/registry/kobalte/blocks/questionnaire";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/registry/kobalte/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import { Toaster } from "@/registry/kobalte/ui/toast";

const questionnaireItems = [
  {
    choices: [{ value: "delegation" }, { value: "questions" }, { value: "both" }],
    name: "direction",
    required: true,
  },
  {
    choices: [{ value: "progress" }, { value: "decisions" }, { value: "risks" }],
    name: "signals",
  },
  {
    choices: [{ value: "week" }, { value: "cycle" }, { value: "later" }],
    name: "timing",
    required: true,
  },
] as const;

const taskItems = [
  {
    choices: [{ value: "inspect" }, { value: "implement" }, { value: "review" }],
    name: "task",
    required: true,
  },
] as const;

export default function QuestionnaireExample() {
  return (
    <>
      <Toaster />
      <ExampleWrapper>
        <QuestionnaireStandalone />
        <QuestionnaireCard />
        <QuestionnaireDialog />
        <QuestionnaireNoDescription />
      </ExampleWrapper>
    </>
  );
}

function QuestionnaireStandalone() {
  return (
    <Example title="Standalone" containerClass="md:col-span-2">
      <Questionnaire.Root
        class="mx-auto max-w-lg"
        defaultItem="direction"
        items={questionnaireItems}
        shortcuts="letters"
        onSubmit={handleSubmit}
      >
        <Questionnaire.Progress />
        <QuestionnaireQuestions />
        <QuestionnaireNavigation />
      </Questionnaire.Root>
    </Example>
  );
}

function QuestionnaireCard() {
  return (
    <Example title="Card" containerClass="md:col-span-2">
      <Questionnaire.Root
        defaultItem="direction"
        items={questionnaireItems}
        shortcuts="numbers"
        onSubmit={handleSubmit}
      >
        <QuestionnaireCardQuestions />
      </Questionnaire.Root>
    </Example>
  );
}

function QuestionnaireDialog() {
  return (
    <Example title="Dialog" class="items-center justify-center" containerClass="md:col-span-2">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          Open questionnaire
        </DialogTrigger>
        <DialogContent>
          <Questionnaire.Root
            defaultItem="direction"
            items={questionnaireItems}
            onSubmit={handleSubmit}
          >
            <DialogHeader>
              <DialogTitle class="sr-only">Plan an agent interface</DialogTitle>
              <DialogDescription class="sr-only">
                Answer three questions to shape the next prototype.
              </DialogDescription>
              <Questionnaire.Progress class="font-semibold text-foreground uppercase tracking-widest">
                {(state) => (
                  <>
                    Question {state.current} of {state.total}
                  </>
                )}
              </Questionnaire.Progress>
            </DialogHeader>
            <QuestionnaireQuestions />
            <DialogFooter>
              <QuestionnaireNavigation />
            </DialogFooter>
          </Questionnaire.Root>
        </DialogContent>
      </Dialog>
    </Example>
  );
}

function QuestionnaireNoDescription() {
  return (
    <Example title="No description" containerClass="md:col-span-2">
      <Questionnaire.Root
        class="mx-auto max-w-lg"
        defaultItem="task"
        items={taskItems}
        shortcuts="letters"
        onSubmit={handleSubmit}
      >
        <Questionnaire.Progress />
        <Questionnaire.Item name="task" required>
          <Questionnaire.Title>What should the agent do next?</Questionnaire.Title>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="inspect">Inspect the codebase</Questionnaire.Choice>
            <Questionnaire.Choice value="implement">Implement the change</Questionnaire.Choice>
            <Questionnaire.Choice value="review">Review the result</Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>
        <QuestionnaireNavigation />
      </Questionnaire.Root>
    </Example>
  );
}

function QuestionnaireCardQuestions() {
  return (
    <>
      <Questionnaire.Item name="direction" required>
        <Card class="mx-auto w-full max-w-lg">
          <CardHeader>
            <Questionnaire.Title class="z-card-title z-font-heading">
              What should we prototype next?
            </Questionnaire.Title>
            <Questionnaire.Description class="z-card-description">
              Choose one direction or write another answer.
            </Questionnaire.Description>
            <CardAction>
              <Questionnaire.Progress />
            </CardAction>
          </CardHeader>
          <CardContent>
            <Questionnaire.Choices>
              <Questionnaire.Choice value="delegation">
                <span class="font-medium">Sub-agent delegation</span>
                <Questionnaire.ChoiceDescription>
                  Show when work is delegated and what comes back.
                </Questionnaire.ChoiceDescription>
              </Questionnaire.Choice>
              <Questionnaire.Choice value="questions">
                <span class="font-medium">Question prompts</span>
                <Questionnaire.ChoiceDescription>
                  Show choices while the agent waits for input.
                </Questionnaire.ChoiceDescription>
              </Questionnaire.Choice>
              <Questionnaire.Choice value="both">
                <span class="font-medium">Both together</span>
                <Questionnaire.ChoiceDescription>
                  Explore one unified interaction pattern.
                </Questionnaire.ChoiceDescription>
              </Questionnaire.Choice>
              <Questionnaire.Input
                aria-label="Another direction"
                placeholder="Type another direction…"
              />
            </Questionnaire.Choices>
            <Questionnaire.Error />
          </CardContent>
          <CardFooter>
            <QuestionnaireNavigation />
          </CardFooter>
        </Card>
      </Questionnaire.Item>
      <Questionnaire.Item name="signals" multiple>
        <Card class="mx-auto w-full max-w-lg">
          <CardHeader>
            <Questionnaire.Title class="z-card-title z-font-heading">
              What should every progress update include?
            </Questionnaire.Title>
            <Questionnaire.Description class="z-card-description">
              Select all that apply, or skip this question.
            </Questionnaire.Description>
            <CardAction>
              <Questionnaire.Progress />
            </CardAction>
          </CardHeader>
          <CardContent>
            <Questionnaire.Choices>
              <Questionnaire.Choice value="progress">Progress</Questionnaire.Choice>
              <Questionnaire.Choice value="decisions">Decisions</Questionnaire.Choice>
              <Questionnaire.Choice value="risks">Risks</Questionnaire.Choice>
            </Questionnaire.Choices>
            <Questionnaire.Error />
          </CardContent>
          <CardFooter>
            <QuestionnaireNavigation />
          </CardFooter>
        </Card>
      </Questionnaire.Item>
      <Questionnaire.Item name="timing" required>
        <Card class="mx-auto w-full max-w-lg">
          <CardHeader>
            <Questionnaire.Title class="z-card-title z-font-heading">
              When should this be revisited?
            </Questionnaire.Title>
            <Questionnaire.Description class="z-card-description">
              Choose when this should be revisited.
            </Questionnaire.Description>
            <CardAction>
              <Questionnaire.Progress />
            </CardAction>
          </CardHeader>
          <CardContent>
            <Questionnaire.Choices>
              <Questionnaire.Choice value="week">This week</Questionnaire.Choice>
              <Questionnaire.Choice value="cycle">Next cycle</Questionnaire.Choice>
              <Questionnaire.Choice value="later">Revisit later</Questionnaire.Choice>
            </Questionnaire.Choices>
            <Questionnaire.Error />
          </CardContent>
          <CardFooter>
            <QuestionnaireNavigation />
          </CardFooter>
        </Card>
      </Questionnaire.Item>
    </>
  );
}

function QuestionnaireQuestions() {
  return (
    <>
      <Questionnaire.Item name="direction" required>
        <Questionnaire.Title>What should we prototype next?</Questionnaire.Title>
        <Questionnaire.Description>
          Choose one direction or write another answer.
        </Questionnaire.Description>
        <Questionnaire.Choices>
          <Questionnaire.Choice value="delegation">
            <span class="font-medium">Sub-agent delegation</span>
            <Questionnaire.ChoiceDescription>
              Show when work is delegated and what comes back.
            </Questionnaire.ChoiceDescription>
          </Questionnaire.Choice>
          <Questionnaire.Choice value="questions">
            <span class="font-medium">Question prompts</span>
            <Questionnaire.ChoiceDescription>
              Show choices while the agent waits for input.
            </Questionnaire.ChoiceDescription>
          </Questionnaire.Choice>
          <Questionnaire.Choice value="both">
            <span class="font-medium">Both together</span>
            <Questionnaire.ChoiceDescription>
              Explore one unified interaction pattern.
            </Questionnaire.ChoiceDescription>
          </Questionnaire.Choice>
          <Questionnaire.Input
            aria-label="Another direction"
            placeholder="Type another direction…"
          />
        </Questionnaire.Choices>
        <Questionnaire.Error />
      </Questionnaire.Item>
      <Questionnaire.Item name="signals" multiple>
        <Questionnaire.Title>What should every progress update include?</Questionnaire.Title>
        <Questionnaire.Description>
          Select all that apply, or skip this question.
        </Questionnaire.Description>
        <Questionnaire.Choices>
          <Questionnaire.Choice value="progress">Progress</Questionnaire.Choice>
          <Questionnaire.Choice value="decisions">Decisions</Questionnaire.Choice>
          <Questionnaire.Choice value="risks">Risks</Questionnaire.Choice>
        </Questionnaire.Choices>
        <Questionnaire.Error />
      </Questionnaire.Item>
      <Questionnaire.Item name="timing" required>
        <Questionnaire.Title>When should this be revisited?</Questionnaire.Title>
        <Questionnaire.Description>Choose when this should be revisited.</Questionnaire.Description>
        <Questionnaire.Choices>
          <Questionnaire.Choice value="week">This week</Questionnaire.Choice>
          <Questionnaire.Choice value="cycle">Next cycle</Questionnaire.Choice>
          <Questionnaire.Choice value="later">Revisit later</Questionnaire.Choice>
        </Questionnaire.Choices>
        <Questionnaire.Error />
      </Questionnaire.Item>
    </>
  );
}

function QuestionnaireNavigation() {
  return (
    <Questionnaire.Actions class="w-full">
      <Questionnaire.Previous />
      <Questionnaire.Skip />
      <Questionnaire.Next>Next</Questionnaire.Next>
      <Questionnaire.Submit>Save answers</Questionnaire.Submit>
    </Questionnaire.Actions>
  );
}

function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const values = {
    direction: formData.get("direction"),
    signals: formData.getAll("signals"),
    timing: formData.get("timing"),
  };

  toast("Questionnaire submitted", {
    description: `Direction: ${values.direction ?? "None"} · Progress signals: ${values.signals.join(", ") || "None"} · Timing: ${values.timing ?? "None"}`,
  });
}
