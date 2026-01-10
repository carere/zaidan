import { File } from "lucide-solid";
import { createMemo, createSignal, For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Progress, ProgressLabel, ProgressValue } from "@/registry/ui/progress";
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "../ui/item";
import { Slider } from "../ui/slider";

export default function ProgressExample() {
  return (
    <ExampleWrapper>
      <ProgressValues />
      <ProgressWithLabel />
      <ProgressControlled />
      <FileUploadList />
    </ExampleWrapper>
  );
}

function ProgressValues() {
  return (
    <Example title="Progress Bar">
      <div class="flex w-full flex-col gap-4">
        <Progress value={0} />
        <Progress value={25} class="w-full" />
        <Progress value={50} />
        <Progress value={75} />
        <Progress value={100} />
      </div>
    </Example>
  );
}

function ProgressWithLabel() {
  return (
    <Example title="With Label">
      <Progress value={56}>
        <ProgressLabel>Upload progress</ProgressLabel>
        <ProgressValue />
      </Progress>
    </Example>
  );
}

function ProgressControlled() {
  const [value, setValue] = createSignal(50);

  return (
    <Example title="Controlled">
      <div class="flex w-full flex-col gap-4">
        <Progress value={value()} class="w-full" />
        <Slider
          value={[value()]}
          onChange={(value) => setValue(value[0])}
          minValue={0}
          maxValue={100}
          step={1}
        />
      </div>
    </Example>
  );
}

function FileUploadList() {
  const files = createMemo(
    () => [
      {
        id: "1",
        name: "document.pdf",
        progress: 45,
        timeRemaining: "2m 30s",
      },
      {
        id: "2",
        name: "presentation.pptx",
        progress: 78,
        timeRemaining: "45s",
      },
      {
        id: "3",
        name: "spreadsheet.xlsx",
        progress: 12,
        timeRemaining: "5m 12s",
      },
      {
        id: "4",
        name: "image.jpg",
        progress: 100,
        timeRemaining: "Complete",
      },
    ],
    [],
  );

  return (
    <Example title="File Upload List">
      <ItemGroup>
        <For each={files()}>
          {(file) => (
            <Item size="xs" class="px-0">
              <ItemMedia variant="icon">
                <File />
              </ItemMedia>
              <ItemContent class="inline-block truncate">
                <ItemTitle class="inline">{file.name}</ItemTitle>
              </ItemContent>
              <ItemContent>
                <Progress value={file.progress} class="w-32" />
              </ItemContent>
              <ItemActions class="w-16 justify-end">
                <span class="text-muted-foreground text-sm">{file.timeRemaining}</span>
              </ItemActions>
            </Item>
          )}
        </For>
      </ItemGroup>
    </Example>
  );
}
