import { Field, FieldLabel } from "@/registry/kobalte/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/registry/kobalte/ui/input-otp";

export default function InputOTPPattern() {
  return (
    <Field class="w-fit">
      <FieldLabel for="digits-only">Digits Only</FieldLabel>
      <InputOTP id="digits-only" maxLength={6} pattern="^\d*$">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </Field>
  );
}
