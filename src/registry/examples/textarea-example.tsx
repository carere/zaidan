import { Example, ExampleWrapper } from "@/components/example";
import { Textarea } from "@/registry/ui/textarea";

export default function TextareaExample() {
  return (
    <ExampleWrapper>
      <TextareaBasic />
      <TextareaInvalid />
      <TextareaWithLabel />
      <TextareaWithDescription />
      <TextareaDisabled />
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
          Message
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
          Message
        </label>
        <Textarea id="message-2" placeholder="Type your message here." />
        <p class="text-muted-foreground text-sm">Type your message and press enter to send.</p>
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
