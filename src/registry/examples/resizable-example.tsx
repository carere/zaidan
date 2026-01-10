import { Example, ExampleWrapper } from "@/components/example";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/registry/ui/resizable";

export default function ResizableExample() {
  return (
    <ExampleWrapper>
      <ResizableDemo />
      <ResizableVertical />
      <ResizableHandleDemo />
    </ExampleWrapper>
  );
}

function ResizableDemo() {
  return (
    <Example title="Demo">
      <ResizablePanelGroup
        orientation="horizontal"
        class="max-w-md rounded-lg border md:min-w-[450px]"
      >
        <ResizablePanel initialSize={0.5}>
          <div class="flex h-[200px] items-center justify-center p-6">
            <span class="font-semibold">One</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel initialSize={0.5}>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel initialSize={0.25}>
              <div class="flex h-full items-center justify-center p-6">
                <span class="font-semibold">Two</span>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel initialSize={0.75}>
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

function ResizableVertical() {
  return (
    <Example title="Vertical">
      <ResizablePanelGroup
        orientation="vertical"
        class="min-h-[200px] max-w-md rounded-lg border md:min-w-[450px]"
      >
        <ResizablePanel initialSize={0.25}>
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Header</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel initialSize={0.75}>
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Content</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Example>
  );
}

function ResizableHandleDemo() {
  return (
    <Example title="With Handle">
      <ResizablePanelGroup
        orientation="horizontal"
        class="min-h-[200px] max-w-md rounded-lg border md:min-w-[450px]"
      >
        <ResizablePanel initialSize={0.25}>
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Sidebar</span>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel initialSize={0.75}>
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Content</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Example>
  );
}
