import { createSignal } from "solid-js";
import { toast } from "solid-sonner";
import { Questionnaire } from "@/registry/kobalte/blocks/questionnaire";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import { Toaster } from "@/registry/kobalte/ui/toast";

const items = [
  { name: "scope", required: true },
  { name: "tests", required: true },
] as const;

export default function QuestionnaireDialog() {
  const [open, setOpen] = createSignal(false);

  function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setOpen(false);
    toast("Clarification sent", {
      description: `Scope: ${formData.get("scope") ?? "None"} · Verification: ${formData.get("tests") ?? "None"}`,
    });
  }

  return (
    <>
      <Toaster />
      <Dialog open={open()} onOpenChange={setOpen}>
        <DialogTrigger as={Button} variant="outline">
          Open clarification
        </DialogTrigger>
        <DialogContent>
          <Questionnaire.Root defaultItem="scope" items={items} onSubmit={handleSubmit}>
            <Questionnaire.Item name="scope" required>
              <DialogHeader>
                <Questionnaire.Progress />
                <Questionnaire.Title class="z-dialog-title z-font-heading">
                  Which files are in scope?
                </Questionnaire.Title>
                <Questionnaire.Description class="z-dialog-description">
                  Choose how broadly the agent can update the workspace.
                </Questionnaire.Description>
              </DialogHeader>
              <Questionnaire.Choices>
                <Questionnaire.Choice value="component">Component only</Questionnaire.Choice>
                <Questionnaire.Choice value="feature">
                  Complete feature directory
                </Questionnaire.Choice>
                <Questionnaire.Choice value="workspace">
                  Any related workspace file
                </Questionnaire.Choice>
              </Questionnaire.Choices>
              <Questionnaire.Error />
            </Questionnaire.Item>

            <Questionnaire.Item name="tests" required>
              <DialogHeader>
                <Questionnaire.Progress />
                <Questionnaire.Title class="z-dialog-title z-font-heading">
                  How much verification is needed?
                </Questionnaire.Title>
                <Questionnaire.Description class="z-dialog-description">
                  Choose the checks the agent should run before handoff.
                </Questionnaire.Description>
              </DialogHeader>
              <Questionnaire.Choices>
                <Questionnaire.Choice value="targeted">Targeted tests</Questionnaire.Choice>
                <Questionnaire.Choice value="package">Package tests</Questionnaire.Choice>
                <Questionnaire.Choice value="full">
                  Full workspace verification
                </Questionnaire.Choice>
              </Questionnaire.Choices>
              <Questionnaire.Error />
            </Questionnaire.Item>

            <DialogFooter>
              <DialogClose as={Button} type="button" variant="outline">
                Cancel
              </DialogClose>
              <Questionnaire.Actions>
                <Questionnaire.Previous />
                <Questionnaire.Next>Next</Questionnaire.Next>
                <Questionnaire.Submit>Send answer</Questionnaire.Submit>
              </Questionnaire.Actions>
            </DialogFooter>
          </Questionnaire.Root>
        </DialogContent>
      </Dialog>
    </>
  );
}
