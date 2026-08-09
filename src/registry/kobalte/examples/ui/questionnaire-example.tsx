import { toast } from "solid-sonner";
import { Example, ExampleWrapper } from "@/components/example";
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
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/registry/kobalte/ui/questionnaire";
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
      <Questionnaire
        class="mx-auto max-w-lg"
        defaultItem="direction"
        items={questionnaireItems}
        shortcuts="letters"
        onSubmit={handleSubmit}
      >
        <QuestionnaireProgress />
        <QuestionnaireQuestions />
        <QuestionnaireNavigation />
      </Questionnaire>
    </Example>
  );
}

function QuestionnaireCard() {
  return (
    <Example title="Card" containerClass="md:col-span-2">
      <Questionnaire
        defaultItem="direction"
        items={questionnaireItems}
        shortcuts="numbers"
        onSubmit={handleSubmit}
      >
        <QuestionnaireCardQuestions />
      </Questionnaire>
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
          <Questionnaire defaultItem="direction" items={questionnaireItems} onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle class="sr-only">Plan an agent interface</DialogTitle>
              <DialogDescription class="sr-only">
                Answer three questions to shape the next prototype.
              </DialogDescription>
              <QuestionnaireProgress class="font-semibold text-foreground uppercase tracking-widest">
                {(state) => (
                  <>
                    Question {state.current} of {state.total}
                  </>
                )}
              </QuestionnaireProgress>
            </DialogHeader>
            <QuestionnaireQuestions />
            <DialogFooter>
              <QuestionnaireNavigation />
            </DialogFooter>
          </Questionnaire>
        </DialogContent>
      </Dialog>
    </Example>
  );
}

function QuestionnaireNoDescription() {
  return (
    <Example title="No description" containerClass="md:col-span-2">
      <Questionnaire
        class="mx-auto max-w-lg"
        defaultItem="task"
        items={taskItems}
        shortcuts="letters"
        onSubmit={handleSubmit}
      >
        <QuestionnaireProgress />
        <QuestionnaireItem name="task" required>
          <QuestionnaireTitle>What should the agent do next?</QuestionnaireTitle>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="inspect">Inspect the codebase</QuestionnaireChoice>
            <QuestionnaireChoice value="implement">Implement the change</QuestionnaireChoice>
            <QuestionnaireChoice value="review">Review the result</QuestionnaireChoice>
          </QuestionnaireChoices>
          <QuestionnaireError />
        </QuestionnaireItem>
        <QuestionnaireNavigation />
      </Questionnaire>
    </Example>
  );
}

function QuestionnaireCardQuestions() {
  return (
    <>
      <QuestionnaireItem name="direction" required>
        <Card class="mx-auto w-full max-w-lg">
          <CardHeader>
            <QuestionnaireTitle class="z-card-title z-font-heading">
              What should we prototype next?
            </QuestionnaireTitle>
            <QuestionnaireDescription class="z-card-description">
              Choose one direction or write another answer.
            </QuestionnaireDescription>
            <CardAction>
              <QuestionnaireProgress />
            </CardAction>
          </CardHeader>
          <CardContent>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="delegation">
                <span class="font-medium">Sub-agent delegation</span>
                <QuestionnaireChoiceDescription>
                  Show when work is delegated and what comes back.
                </QuestionnaireChoiceDescription>
              </QuestionnaireChoice>
              <QuestionnaireChoice value="questions">
                <span class="font-medium">Question prompts</span>
                <QuestionnaireChoiceDescription>
                  Show choices while the agent waits for input.
                </QuestionnaireChoiceDescription>
              </QuestionnaireChoice>
              <QuestionnaireChoice value="both">
                <span class="font-medium">Both together</span>
                <QuestionnaireChoiceDescription>
                  Explore one unified interaction pattern.
                </QuestionnaireChoiceDescription>
              </QuestionnaireChoice>
              <QuestionnaireInput
                aria-label="Another direction"
                placeholder="Type another direction…"
              />
            </QuestionnaireChoices>
            <QuestionnaireError />
          </CardContent>
          <CardFooter>
            <QuestionnaireNavigation />
          </CardFooter>
        </Card>
      </QuestionnaireItem>
      <QuestionnaireItem name="signals" multiple>
        <Card class="mx-auto w-full max-w-lg">
          <CardHeader>
            <QuestionnaireTitle class="z-card-title z-font-heading">
              What should every progress update include?
            </QuestionnaireTitle>
            <QuestionnaireDescription class="z-card-description">
              Select all that apply, or skip this question.
            </QuestionnaireDescription>
            <CardAction>
              <QuestionnaireProgress />
            </CardAction>
          </CardHeader>
          <CardContent>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="progress">Progress</QuestionnaireChoice>
              <QuestionnaireChoice value="decisions">Decisions</QuestionnaireChoice>
              <QuestionnaireChoice value="risks">Risks</QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </CardContent>
          <CardFooter>
            <QuestionnaireNavigation />
          </CardFooter>
        </Card>
      </QuestionnaireItem>
      <QuestionnaireItem name="timing" required>
        <Card class="mx-auto w-full max-w-lg">
          <CardHeader>
            <QuestionnaireTitle class="z-card-title z-font-heading">
              When should this be revisited?
            </QuestionnaireTitle>
            <QuestionnaireDescription class="z-card-description">
              Choose when this should be revisited.
            </QuestionnaireDescription>
            <CardAction>
              <QuestionnaireProgress />
            </CardAction>
          </CardHeader>
          <CardContent>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="week">This week</QuestionnaireChoice>
              <QuestionnaireChoice value="cycle">Next cycle</QuestionnaireChoice>
              <QuestionnaireChoice value="later">Revisit later</QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </CardContent>
          <CardFooter>
            <QuestionnaireNavigation />
          </CardFooter>
        </Card>
      </QuestionnaireItem>
    </>
  );
}

function QuestionnaireQuestions() {
  return (
    <>
      <QuestionnaireItem name="direction" required>
        <QuestionnaireTitle>What should we prototype next?</QuestionnaireTitle>
        <QuestionnaireDescription>
          Choose one direction or write another answer.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="delegation">
            <span class="font-medium">Sub-agent delegation</span>
            <QuestionnaireChoiceDescription>
              Show when work is delegated and what comes back.
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="questions">
            <span class="font-medium">Question prompts</span>
            <QuestionnaireChoiceDescription>
              Show choices while the agent waits for input.
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="both">
            <span class="font-medium">Both together</span>
            <QuestionnaireChoiceDescription>
              Explore one unified interaction pattern.
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireInput
            aria-label="Another direction"
            placeholder="Type another direction…"
          />
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireItem name="signals" multiple>
        <QuestionnaireTitle>What should every progress update include?</QuestionnaireTitle>
        <QuestionnaireDescription>
          Select all that apply, or skip this question.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="progress">Progress</QuestionnaireChoice>
          <QuestionnaireChoice value="decisions">Decisions</QuestionnaireChoice>
          <QuestionnaireChoice value="risks">Risks</QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireItem name="timing" required>
        <QuestionnaireTitle>When should this be revisited?</QuestionnaireTitle>
        <QuestionnaireDescription>Choose when this should be revisited.</QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="week">This week</QuestionnaireChoice>
          <QuestionnaireChoice value="cycle">Next cycle</QuestionnaireChoice>
          <QuestionnaireChoice value="later">Revisit later</QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
    </>
  );
}

function QuestionnaireNavigation() {
  return (
    <QuestionnaireActions class="w-full">
      <QuestionnairePrevious />
      <QuestionnaireSkip />
      <QuestionnaireNext>Next</QuestionnaireNext>
      <QuestionnaireSubmit>Save answers</QuestionnaireSubmit>
    </QuestionnaireActions>
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
