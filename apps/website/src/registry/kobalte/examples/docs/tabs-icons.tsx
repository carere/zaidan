import { AppWindow, Code } from "lucide-solid";
import { Tabs, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";

export default function TabsIcons() {
  return (
    <Tabs defaultValue="preview">
      <TabsList>
        <TabsTrigger value="preview">
          <AppWindow />
          Preview
        </TabsTrigger>
        <TabsTrigger value="code">
          <Code />
          Code
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
