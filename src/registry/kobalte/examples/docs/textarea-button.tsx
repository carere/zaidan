import { Button } from "@/registry/kobalte/ui/button";
import { Textarea } from "@/registry/kobalte/ui/textarea";

export default function TextareaButton() {
  return (
    <div class="grid w-full gap-2">
      <Textarea placeholder="Type your message here." />
      <Button>Send message</Button>
    </div>
  );
}
