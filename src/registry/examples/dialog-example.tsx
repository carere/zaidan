import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/ui/dialog";
import { Input } from "@/registry/ui/input";
import { Label } from "@/registry/ui/label";

export default function DialogExample() {
  return (
    <ExampleWrapper>
      <DialogWithForm />
      <DialogScrollableContent />
      <DialogWithStickyFooter />
      <DialogNoCloseButton />
      {/* <DialogChatSettings /> */}
    </ExampleWrapper>
  );
}

function DialogWithForm() {
  return (
    <Example title="With Form" class="items-center justify-center">
      <Dialog>
        <form>
          <DialogTrigger as={Button} variant="outline">
            Edit Profile
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Make changes to your profile here. Click save when you're done. Your profile will be
                updated immediately.
              </DialogDescription>
            </DialogHeader>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <Label for="name-1">Name</Label>
                <Input id="name-1" name="name" value="Pedro Duarte" />
              </div>
              <div class="flex flex-col gap-2">
                <Label for="username-1">Username</Label>
                <Input id="username-1" name="username" value="@peduarte" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose as={Button} variant="outline">
                Cancel
              </DialogClose>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>
    </Example>
  );
}

function DialogScrollableContent() {
  return (
    <Example title="Scrollable Content" class="items-center justify-center">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          Scrollable Content
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scrollable Content</DialogTitle>
            <DialogDescription>This is a dialog with scrollable content.</DialogDescription>
          </DialogHeader>
          <div class="max-h-[70vh] overflow-y-auto">
            <For each={Array.from({ length: 10 })}>
              {() => (
                <p class="mb-4 leading-normal">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute
                  irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
                  pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
                  officia deserunt mollit anim id est laborum.
                </p>
              )}
            </For>
          </div>
        </DialogContent>
      </Dialog>
    </Example>
  );
}

function DialogWithStickyFooter() {
  return (
    <Example title="With Sticky Footer" class="items-center justify-center">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          Sticky Footer
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scrollable Content</DialogTitle>
            <DialogDescription>This is a dialog with scrollable content.</DialogDescription>
          </DialogHeader>
          <div class="max-h-[70vh] overflow-y-auto">
            <For each={Array.from({ length: 10 })}>
              {() => (
                <p class="mb-4 leading-normal">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute
                  irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
                  pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
                  officia deserunt mollit anim id est laborum.
                </p>
              )}
            </For>
          </div>
          <DialogFooter>
            <DialogClose as={Button} variant="outline">
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Example>
  );
}

function DialogNoCloseButton() {
  return (
    <Example title="No Close Button" class="items-center justify-center">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          No Close Button
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>No Close Button</DialogTitle>
            <DialogDescription>
              This dialog doesn't have a close button in the top-right corner.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose as={Button} variant="outline">
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Example>
  );
}

// function DialogChatSettings() {
//   const [tab, setTab] = createSignal("general");
//   const [theme, setTheme] = createSignal("system");
//   const [accentColor, setAccentColor] = createSignal("default");
//   const [spokenLanguage, setSpokenLanguage] = createSignal("en");
//   const [voice, setVoice] = createSignal("samantha");

//   return (
//     <Example title="Chat Settings" class="items-center justify-center">
//       <Dialog>
//         <DialogTrigger as={Button} variant="outline">
//           Chat Settings
//         </DialogTrigger>
//         <DialogContent class="min-w-md">
//           <DialogHeader>
//             <DialogTitle>Chat Settings</DialogTitle>
//             <DialogDescription>
//               Customize your chat settings: theme, accent color, spoken language, voice,
//               personality, and custom instructions.
//             </DialogDescription>
//           </DialogHeader>
//           <div class="flex flex-col gap-4">
//             <NativeSelect
//               value={tab()}
//               onChange={(e) => setTab(e.target.value)}
//               class="w-full md:hidden"
//             >
//               <NativeSelectOption value="general">General</NativeSelectOption>
//               <NativeSelectOption value="notifications">Notifications</NativeSelectOption>
//               <NativeSelectOption value="personalization">Personalization</NativeSelectOption>
//               <NativeSelectOption value="security">Security</NativeSelectOption>
//             </NativeSelect>
//             <Tabs value={tab} onValueChange={setTab}>
//               <TabsList class="hidden w-full md:flex">
//                 <TabsTrigger value="general">General</TabsTrigger>
//                 <TabsTrigger value="notifications">Notifications</TabsTrigger>
//                 <TabsTrigger value="personalization">Personalization</TabsTrigger>
//                 <TabsTrigger value="security">Security</TabsTrigger>
//               </TabsList>
//               <div class="style-lyra:min-h-[450px] style-maia:min-h-[550px] style-mira:min-h-[450px] style-nova:min-h-[460px] style-vega:min-h-[550px] style-lyra:rounded-none style-maia:rounded-xl style-mira:rounded-md style-nova:rounded-lg style-vega:rounded-lg border style-lyra:p-4 style-maia:p-6 style-mira:p-4 style-nova:p-4 style-vega:p-6 [&_[data-slot=select-trigger]]:min-w-[125px]">
//                 <TabsContent value="general">
//                   <FieldSet>
//                     <FieldGroup>
//                       <Field orientation="horizontal">
//                         <FieldLabel htmlFor="theme">Theme</FieldLabel>
//                         <Select
//                           items={themes}
//                           value={theme}
//                           onValueChange={(value) => setTheme(value as string)}
//                         >
//                           <SelectTrigger id="theme">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent align="end">
//                             <SelectGroup>
//                               {themes.map((theme) => (
//                                 <SelectItem key={theme.value} value={theme.value}>
//                                   {theme.label}
//                                 </SelectItem>
//                               ))}
//                             </SelectGroup>
//                           </SelectContent>
//                         </Select>
//                       </Field>
//                       <FieldSeparator />
//                       <Field orientation="horizontal">
//                         <FieldLabel htmlFor="accent-color">Accent Color</FieldLabel>
//                         <Select
//                           items={accents}
//                           value={accentColor}
//                           onValueChange={(value) => setAccentColor(value as string)}
//                         >
//                           <SelectTrigger id="accent-color">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent align="end">
//                             <SelectGroup>
//                               {accents.map((accent) => (
//                                 <SelectItem key={accent.value} value={accent.value}>
//                                   {accent.label}
//                                 </SelectItem>
//                               ))}
//                             </SelectGroup>
//                           </SelectContent>
//                         </Select>
//                       </Field>
//                       <FieldSeparator />
//                       <Field orientation="responsive">
//                         <FieldContent>
//                           <FieldLabel htmlFor="spoken-language">Spoken Language</FieldLabel>
//                           <FieldDescription>
//                             For best results, select the language you mainly speak. If it&apos;s not
//                             listed, it may still be supported via auto-detection.
//                           </FieldDescription>
//                         </FieldContent>
//                         <Select
//                           items={spokenLanguages}
//                           value={spokenLanguage}
//                           onValueChange={(value) => setSpokenLanguage(value as string)}
//                         >
//                           <SelectTrigger id="spoken-language">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent align="end">
//                             <SelectGroup>
//                               {spokenLanguages.map((language) => (
//                                 <SelectItem key={language.value} value={language.value}>
//                                   {language.label}
//                                 </SelectItem>
//                               ))}
//                             </SelectGroup>
//                           </SelectContent>
//                         </Select>
//                       </Field>
//                       <FieldSeparator />
//                       <Field orientation="horizontal">
//                         <FieldLabel htmlFor="voice">Voice</FieldLabel>
//                         <Select
//                           items={voices}
//                           value={voice}
//                           onValueChange={(value) => setVoice(value as string)}
//                         >
//                           <SelectTrigger id="voice">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent align="end">
//                             <SelectGroup>
//                               {voices.map((voice) => (
//                                 <SelectItem key={voice.value} value={voice.value}>
//                                   {voice.label}
//                                 </SelectItem>
//                               ))}
//                             </SelectGroup>
//                           </SelectContent>
//                         </Select>
//                       </Field>
//                     </FieldGroup>
//                   </FieldSet>
//                 </TabsContent>
//                 <TabsContent value="notifications">
//                   <FieldGroup>
//                     <FieldSet>
//                       <FieldLabel>Responses</FieldLabel>
//                       <FieldDescription>
//                         Get notified when ChatGPT responds to requests that take time, like research
//                         or image generation.
//                       </FieldDescription>
//                       <FieldGroup data-slot="checkbox-group">
//                         <Field orientation="horizontal">
//                           <Checkbox id="push" defaultChecked disabled />
//                           <FieldLabel htmlFor="push" class="font-normal">
//                             Push notifications
//                           </FieldLabel>
//                         </Field>
//                       </FieldGroup>
//                     </FieldSet>
//                     <FieldSeparator />
//                     <FieldSet>
//                       <FieldLabel>Tasks</FieldLabel>
//                       <FieldDescription>
//                         Get notified when tasks you&apos;ve created have updates.{" "}
//                         <a href="#">Manage tasks</a>
//                       </FieldDescription>
//                       <FieldGroup data-slot="checkbox-group">
//                         <Field orientation="horizontal">
//                           <Checkbox id="push-tasks" />
//                           <FieldLabel htmlFor="push-tasks" class="font-normal">
//                             Push notifications
//                           </FieldLabel>
//                         </Field>
//                         <Field orientation="horizontal">
//                           <Checkbox id="email-tasks" />
//                           <FieldLabel htmlFor="email-tasks" class="font-normal">
//                             Email notifications
//                           </FieldLabel>
//                         </Field>
//                       </FieldGroup>
//                     </FieldSet>
//                   </FieldGroup>
//                 </TabsContent>
//                 <TabsContent value="personalization">
//                   <FieldGroup>
//                     <Field orientation="responsive">
//                       <FieldLabel htmlFor="nickname">Nickname</FieldLabel>
//                       <InputGroup>
//                         <InputGroupInput
//                           id="nickname"
//                           placeholder="Broski"
//                           class="@md/field-group:max-w-[200px]"
//                         />
//                         <InputGroupAddon align="inline-end">
//                           <Tooltip>
//                             <TooltipTrigger render={<InputGroupButton size="icon-xs" />}>
//                               <IconPlaceholder
//                                 lucide="InfoIcon"
//                                 tabler="IconInfoCircle"
//                                 hugeicons="AlertCircleIcon"
//                                 phosphor="InfoIcon"
//                               />
//                             </TooltipTrigger>
//                             <TooltipContent class="flex items-center gap-2">
//                               Used to identify you in the chat. <Kbd>N</Kbd>
//                             </TooltipContent>
//                           </Tooltip>
//                         </InputGroupAddon>
//                       </InputGroup>
//                     </Field>
//                     <FieldSeparator />
//                     <Field
//                       orientation="responsive"
//                       class="@2xl/field-group:flex-row @md/field-group:flex-col"
//                     >
//                       <FieldContent>
//                         <FieldLabel htmlFor="about">More about you</FieldLabel>
//                         <FieldDescription>
//                           Tell us more about yourself. This will be used to help us personalize your
//                           experience.
//                         </FieldDescription>
//                       </FieldContent>
//                       <Textarea
//                         id="about"
//                         placeholder="I'm a software engineer..."
//                         class="min-h-[120px] @2xl/field-group:min-w-[300px] @md/field-group:min-w-full"
//                       />
//                     </Field>
//                     <FieldSeparator />
//                     <FieldLabel>
//                       <Field orientation="horizontal">
//                         <FieldContent>
//                           <FieldLabel htmlFor="customization">Enable customizations</FieldLabel>
//                           <FieldDescription>
//                             Enable customizations to make ChatGPT more personalized.
//                           </FieldDescription>
//                         </FieldContent>
//                         <Switch id="customization" defaultChecked />
//                       </Field>
//                     </FieldLabel>
//                   </FieldGroup>
//                 </TabsContent>
//                 <TabsContent value="security">
//                   <FieldGroup>
//                     <Field orientation="horizontal">
//                       <FieldContent>
//                         <FieldLabel htmlFor="2fa">Multi-factor authentication</FieldLabel>
//                         <FieldDescription>
//                           Enable multi-factor authentication to secure your account. If you do not
//                           have a two-factor authentication device, you can use a one-time code sent
//                           to your email.
//                         </FieldDescription>
//                       </FieldContent>
//                       <Switch id="2fa" />
//                     </Field>
//                     <FieldSeparator />
//                     <Field orientation="horizontal">
//                       <FieldContent>
//                         <FieldTitle>Log out</FieldTitle>
//                         <FieldDescription>Log out of your account on this device.</FieldDescription>
//                       </FieldContent>
//                       <Button variant="outline" size="sm">
//                         Log Out
//                       </Button>
//                     </Field>
//                     <FieldSeparator />
//                     <Field orientation="horizontal">
//                       <FieldContent>
//                         <FieldTitle>Log out of all devices</FieldTitle>
//                         <FieldDescription>
//                           This will log you out of all devices, including the current session. It
//                           may take up to 30 minutes for the changes to take effect.
//                         </FieldDescription>
//                       </FieldContent>
//                       <Button variant="outline" size="sm">
//                         Log Out All
//                       </Button>
//                     </Field>
//                   </FieldGroup>
//                 </TabsContent>
//               </div>
//             </Tabs>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </Example>
//   );
// }
