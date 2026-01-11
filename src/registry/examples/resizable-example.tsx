import { createSignal } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/registry/ui/resizable";

export default function ResizableExample() {
  return (
    <ExampleWrapper>
      <ResizableHorizontal />
      <ResizableVertical />
      <ResizableWithHandle />
      <ResizableNested />
      <ResizableControlled />
    </ExampleWrapper>
  );
}

function ResizableHorizontal() {
  return (
    <Example title="Horizontal">
      <ResizablePanelGroup orientation="horizontal" class="min-h-[200px] rounded-lg border">
        <ResizablePanel initialSize={25}>
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Sidebar</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel initialSize={75}>
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Content</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Example>
  );
}

function ResizableVertical() {
  return (
    <Example title="Vertical">
      <ResizablePanelGroup orientation="vertical" class="min-h-[200px] rounded-lg border">
        <ResizablePanel initialSize={25}>
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Header</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel initialSize={75}>
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Content</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Example>
  );
}

function ResizableWithHandle() {
  return (
    <Example title="With Handle">
      <ResizablePanelGroup orientation="horizontal" class="min-h-[200px] rounded-lg border">
        <ResizablePanel initialSize={25}>
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Sidebar</span>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel initialSize={75}>
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Content</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Example>
  );
}

function ResizableNested() {
  return (
    <Example title="Nested">
      <ResizablePanelGroup orientation="horizontal" class="rounded-lg border">
        <ResizablePanel initialSize={50}>
          <div class="flex h-[200px] items-center justify-center p-6">
            <span class="font-semibold">One</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel initialSize={50}>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel initialSize={25}>
              <div class="flex h-full items-center justify-center p-6">
                <span class="font-semibold">Two</span>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel initialSize={75}>
              <div class="flex h-full items-center justify-center p-6">
                <span class="font-semibold">Three</span>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Example>
  );
}

function ResizableControlled() {
  const [sizes, setSizes] = createSignal([30, 70]);

  return (
    <Example title="Controlled">
      <ResizablePanelGroup
        orientation="horizontal"
        class="min-h-[200px] rounded-lg border"
        onSizesChange={setSizes}
        sizes={sizes()}
      >
        <ResizablePanel>
          <div class="flex h-full flex-col items-center justify-center gap-2 p-6">
            <span class="font-semibold">{Math.round(sizes()[0] ?? 30)}%</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div class="flex h-full flex-col items-center justify-center gap-2 p-6">
            <span class="font-semibold">{Math.round(sizes()[1] ?? 70)}%</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Example>
  );
}
