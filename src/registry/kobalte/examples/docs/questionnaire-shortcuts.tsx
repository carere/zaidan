import { createSignal } from "solid-js";
import { toast } from "solid-sonner";
import {
  Questionnaire,
  type QuestionnaireShortcutMode,
} from "@/registry/kobalte/blocks/questionnaire";
import { NativeSelect, NativeSelectOption } from "@/registry/kobalte/ui/native-select";
import { Toaster } from "@/registry/kobalte/ui/toast";

const items = [
  {
    choices: [{ value: "inspect" }, { value: "tests" }, { value: "patch" }],
    name: "action",
    required: true,
  },
] as const;

export default function QuestionnaireShortcuts() {
  const [shortcuts, setShortcuts] = createSignal<QuestionnaireShortcutMode | undefined>("letters");

  function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();

    const action = new FormData(event.currentTarget).get("action");

    toast("Next action selected", {
      description: `Action: ${action ?? "None"} · Shortcuts: ${shortcuts() ?? "none"}`,
    });
  }

  return (
    <div class="relative mx-auto flex h-full w-full max-w-md flex-col">
      <Toaster />
      <NativeSelect
        aria-label="Shortcut style"
        class="absolute end-0 top-0"
        value={shortcuts() ?? "none"}
        onChange={(event) => {
          const value = event.currentTarget.value;
          setShortcuts(value === "letters" || value === "numbers" ? value : undefined);
        }}
      >
        <NativeSelectOption value="none">No shortcuts</NativeSelectOption>
        <NativeSelectOption value="letters">Letters</NativeSelectOption>
        <NativeSelectOption value="numbers">Numbers</NativeSelectOption>
      </NativeSelect>

      <Questionnaire.Root
        class="mt-auto"
        items={items}
        shortcuts={shortcuts()}
        onSubmit={handleSubmit}
      >
        <Questionnaire.Item name="action" required>
          <Questionnaire.Title>What should the agent do next?</Questionnaire.Title>
          <Questionnaire.Description>
            Use the displayed shortcut or navigate with the keyboard.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="inspect">Inspect the implementation</Questionnaire.Choice>
            <Questionnaire.Choice value="tests">Run the relevant tests</Questionnaire.Choice>
            <Questionnaire.Choice value="patch">Prepare the patch</Questionnaire.Choice>
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Actions>
          <Questionnaire.Submit>Confirm action</Questionnaire.Submit>
        </Questionnaire.Actions>
      </Questionnaire.Root>
    </div>
  );
}
