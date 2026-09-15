import { Field, FieldLabel } from "@/registry/kobalte/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/registry/kobalte/ui/input-otp";

const REGEXP_ONLY_DIGITS_AND_CHARS = "^[a-zA-Z0-9]*$";

export default function InputOTPPattern() {
  return (
    <Field class="w-fit">
      <FieldLabel for="digits-and-chars">Digits and characters</FieldLabel>
      <InputOTP id="digits-and-chars" maxLength={6} pattern={REGEXP_ONLY_DIGITS_AND_CHARS}>
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
