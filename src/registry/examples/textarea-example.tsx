import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import { Textarea } from "@/registry/ui/textarea";

export default function TextareaExample() {
  return (
    <ExampleWrapper>
      <TextareaBasic />
      <TextareaInvalid />
      <TextareaWithLabel />
      <TextareaWithDescription />
      <TextareaDisabled />
      <TextareaWithButton />
    </ExampleWrapper>
  );
}

function TextareaBasic() {
  return (
    <Example title="Basic">
      <Textarea placeholder="Type your message here." />
    </Example>
  );
}

function TextareaInvalid() {
  return (
    <Example title="Invalid">
      <Textarea aria-invalid="true" placeholder="Type your message here." />
    </Example>
  );
}

function TextareaWithLabel() {
  return (
    <Example title="With Label">
      <div class="grid w-full gap-1.5">
        <label
          for="message"
          class="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Your message
        </label>
        <Textarea id="message" placeholder="Type your message here." rows={4} />
      </div>
    </Example>
  );
}

function TextareaWithDescription() {
  return (
    <Example title="With Description">
      <div class="grid w-full gap-1.5">
        <label
          for="message-2"
          class="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Your message
        </label>
        <Textarea id="message-2" placeholder="Type your message here." />
        <p class="text-muted-foreground text-sm">
          Your message will be copied to the support team.
        </p>
      </div>
    </Example>
  );
}

function TextareaDisabled() {
  return (
    <Example title="Disabled">
      <Textarea placeholder="Type your message here." disabled />
    </Example>
  );
}

function TextareaWithButton() {
  return (
    <Example title="With Button">
      <div class="grid w-full gap-2">
        <Textarea placeholder="Type your message here." />
        <Button>Send message</Button>
      </div>
    </Example>
  );
}
