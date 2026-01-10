import { Example, ExampleWrapper } from "@/components/example";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/registry/ui/field";
import { Input } from "@/registry/ui/input";
import { Switch } from "@/registry/ui/switch";
import { Textarea } from "@/registry/ui/textarea";

export default function FieldExample() {
  return (
    <ExampleWrapper>
      <InputFields />
      <TextareaFields />
      <SwitchFields />
      <FieldSetExample />
      <FieldSeparatorExample />
      <FieldErrorExample />
    </ExampleWrapper>
  );
}

function InputFields() {
  return (
    <Example title="Input Fields">
      <FieldGroup>
        <Field>
          <FieldLabel for="input-basic">Basic Input</FieldLabel>
          <Input id="input-basic" placeholder="Enter text" />
        </Field>
        <Field>
          <FieldLabel for="input-with-desc">Input with Description</FieldLabel>
          <Input id="input-with-desc" placeholder="Enter your username" />
          <FieldDescription>Choose a unique username for your account.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel for="input-desc-first">Email Address</FieldLabel>
          <FieldDescription>We'll never share your email with anyone.</FieldDescription>
          <Input id="input-desc-first" type="email" placeholder="email@example.com" />
        </Field>
        <Field>
          <FieldLabel for="input-required">
            Required Field <span class="text-destructive">*</span>
          </FieldLabel>
          <Input id="input-required" placeholder="This field is required" required />
          <FieldDescription>This field must be filled out.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel for="input-disabled">Disabled Input</FieldLabel>
          <Input id="input-disabled" placeholder="Cannot edit" disabled />
          <FieldDescription>This field is currently disabled.</FieldDescription>
        </Field>
        <Field data-invalid>
          <FieldLabel for="input-invalid">Invalid Input</FieldLabel>
          <Input id="input-invalid" placeholder="This field has an error" aria-invalid />
          <FieldDescription>This field contains validation errors.</FieldDescription>
        </Field>
        <Field data-disabled>
          <FieldLabel for="input-disabled-field">Disabled Field</FieldLabel>
          <Input id="input-disabled-field" placeholder="Cannot edit" disabled />
          <FieldDescription>This field is currently disabled.</FieldDescription>
        </Field>
      </FieldGroup>
    </Example>
  );
}

function TextareaFields() {
  return (
    <Example title="Textarea Fields">
      <FieldGroup>
        <Field>
          <FieldLabel for="textarea-basic">Basic Textarea</FieldLabel>
          <Textarea id="textarea-basic" placeholder="Enter your message" />
        </Field>
        <Field>
          <FieldLabel for="textarea-comments">Comments</FieldLabel>
          <Textarea
            id="textarea-comments"
            placeholder="Share your thoughts..."
            class="min-h-[100px]"
          />
          <FieldDescription>Maximum 500 characters allowed.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel for="textarea-bio">Bio</FieldLabel>
          <FieldDescription>Tell us about yourself in a few sentences.</FieldDescription>
          <Textarea id="textarea-bio" placeholder="I am a..." class="min-h-[120px]" />
        </Field>
        <Field data-invalid>
          <FieldLabel for="textarea-invalid">Invalid Textarea</FieldLabel>
          <Textarea id="textarea-invalid" placeholder="This field has an error" aria-invalid />
          <FieldDescription>This field contains validation errors.</FieldDescription>
        </Field>
        <Field data-disabled>
          <FieldLabel for="textarea-disabled-field">Disabled Field</FieldLabel>
          <Textarea id="textarea-disabled-field" placeholder="Cannot edit" disabled />
          <FieldDescription>This field is currently disabled.</FieldDescription>
        </Field>
      </FieldGroup>
    </Example>
  );
}

function SwitchFields() {
  return (
    <Example title="Switch Fields">
      <FieldGroup>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel for="switch-airplane">Airplane Mode</FieldLabel>
            <FieldDescription>Turn on airplane mode to disable all connections.</FieldDescription>
          </FieldContent>
          <Switch id="switch-airplane" />
        </Field>
        <Field orientation="horizontal">
          <FieldLabel for="switch-dark">Dark Mode</FieldLabel>
          <Switch id="switch-dark" />
        </Field>
        <Field orientation="horizontal">
          <Switch id="switch-marketing" />
          <FieldContent>
            <FieldLabel for="switch-marketing">Marketing Emails</FieldLabel>
            <FieldDescription>
              Receive emails about new products, features, and more.
            </FieldDescription>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>Privacy Settings</FieldLabel>
          <FieldDescription>Manage your privacy preferences.</FieldDescription>
          <Field orientation="horizontal">
            <Switch id="switch-profile" defaultChecked />
            <FieldContent>
              <FieldLabel for="switch-profile" class="font-normal">
                Make profile visible to others
              </FieldLabel>
            </FieldContent>
          </Field>
          <Field orientation="horizontal">
            <Switch id="switch-email" />
            <FieldContent>
              <FieldLabel for="switch-email" class="font-normal">
                Show email on profile
              </FieldLabel>
            </FieldContent>
          </Field>
        </Field>
        <Field data-invalid orientation="horizontal">
          <FieldContent>
            <FieldLabel for="switch-invalid">Invalid Switch</FieldLabel>
            <FieldDescription>This switch has validation errors.</FieldDescription>
          </FieldContent>
          <Switch id="switch-invalid" aria-invalid />
        </Field>
        <Field data-disabled orientation="horizontal">
          <FieldContent>
            <FieldLabel for="switch-disabled-field">Disabled Switch</FieldLabel>
            <FieldDescription>This switch is currently disabled.</FieldDescription>
          </FieldContent>
          <Switch id="switch-disabled-field" disabled />
        </Field>
      </FieldGroup>
    </Example>
  );
}

function FieldSetExample() {
  return (
    <Example title="FieldSet and Legend">
      <FieldSet>
        <FieldLegend variant="label">Notification Preferences</FieldLegend>
        <FieldDescription>Select how you want to receive notifications.</FieldDescription>
        <FieldGroup class="gap-3">
          <Field orientation="horizontal">
            <Switch id="pref-email-notifications" />
            <FieldLabel for="pref-email-notifications" class="font-normal">
              Email notifications
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch id="pref-sms-notifications" />
            <FieldLabel for="pref-sms-notifications" class="font-normal">
              SMS notifications
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch id="pref-push-notifications" />
            <FieldLabel for="pref-push-notifications" class="font-normal">
              Push notifications
            </FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
    </Example>
  );
}

function FieldSeparatorExample() {
  return (
    <Example title="Field Separator">
      <FieldGroup>
        <Field>
          <FieldLabel for="sep-email">Email</FieldLabel>
          <Input id="sep-email" type="email" placeholder="Enter your email" />
        </Field>
        <FieldSeparator />
        <Field>
          <FieldLabel for="sep-password">Password</FieldLabel>
          <Input id="sep-password" type="password" placeholder="Enter your password" />
        </Field>
        <FieldSeparator>or</FieldSeparator>
        <Field>
          <FieldLabel for="sep-social">Social Login</FieldLabel>
          <FieldDescription>Sign in with your social account instead.</FieldDescription>
        </Field>
      </FieldGroup>
    </Example>
  );
}

function FieldErrorExample() {
  return (
    <Example title="Field Error">
      <FieldGroup>
        <Field>
          <FieldLabel for="error-username">Username</FieldLabel>
          <Input id="error-username" placeholder="Enter username" aria-invalid />
          <FieldError>Username is already taken.</FieldError>
        </Field>
        <Field>
          <FieldLabel for="error-multi">Password</FieldLabel>
          <Input id="error-multi" type="password" placeholder="Enter password" aria-invalid />
          <FieldError
            errors={[
              { message: "Password must be at least 8 characters." },
              { message: "Password must contain a number." },
              { message: "Password must contain a special character." },
            ]}
          />
        </Field>
      </FieldGroup>
    </Example>
  );
}
