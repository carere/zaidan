import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/registry/kobalte/ui/field";

export default function FieldCheckbox() {
  return (
    <FieldGroup class="w-full max-w-xs">
      <FieldSet>
        <FieldLegend variant="label">Show these items on the desktop</FieldLegend>
        <FieldDescription>Select the items you want to show on the desktop.</FieldDescription>
        <FieldGroup class="gap-3">
          <Field orientation="horizontal">
            <Checkbox id="field-hard-disks" defaultChecked />
            <FieldLabel for="field-hard-disks" class="font-normal">
              Hard disks
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="field-external-disks" />
            <FieldLabel for="field-external-disks" class="font-normal">
              External disks
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="field-cds-dvds" />
            <FieldLabel for="field-cds-dvds" class="font-normal">
              CDs, DVDs, and iPods
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="field-connected-servers" />
            <FieldLabel for="field-connected-servers" class="font-normal">
              Connected servers
            </FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSeparator />
      <Field orientation="horizontal">
        <Checkbox id="field-sync-folders" defaultChecked />
        <FieldContent>
          <FieldLabel for="field-sync-folders">Sync Desktop & Documents folders</FieldLabel>
          <FieldDescription>
            Your Desktop & Documents folders are being synced with iCloud Drive. You can access them
            from other devices.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
