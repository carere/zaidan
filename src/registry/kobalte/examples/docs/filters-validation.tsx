import { AtSign, CreditCard, Globe, Link, Phone, User } from "lucide-solid";
import { createSignal } from "solid-js";
import * as z from "zod";
import {
  createFilter,
  type Filter,
  type FilterFieldConfig,
  Filters,
} from "@/registry/kobalte/blocks/filters";

// `validation` may return a boolean or `{ valid, message }`. Wrapping a Zod
// schema gives the chip a per-field error message in its tooltip.
function zodValidator(schema: z.ZodType) {
  return (value: unknown): { valid: boolean; message?: string } => {
    const result = schema.safeParse(value);
    if (result.success) return { valid: true };
    return { valid: false, message: result.error.issues[0]?.message ?? "Invalid value" };
  };
}

const emailSchema = z
  .string()
  .min(1, { message: "Email is required" })
  .pipe(z.email({ message: "Please enter a valid email address" }));

const urlSchema = z
  .string()
  .pipe(z.url({ message: "Please enter a valid URL (e.g., https://example.com)" }));

const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, { message: "Please enter a valid phone number" });

const usernameSchema = z
  .string()
  .min(3, { message: "Username must be at least 3 characters" })
  .max(20, { message: "Username must be at most 20 characters" })
  .regex(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers, and underscores",
  });

const creditCardSchema = z
  .string()
  .regex(/^\d{13,19}$/, { message: "Please enter a valid credit card number (13-19 digits)" });

export default function FiltersValidation() {
  const fields: FilterFieldConfig[] = [
    {
      key: "email",
      label: "Email",
      type: "text",
      icon: () => <AtSign class="size-3.5" />,
      placeholder: "user@example.com",
      validation: zodValidator(emailSchema),
    },
    {
      key: "website",
      label: "Website",
      type: "text",
      icon: () => <Globe class="size-3.5" />,
      placeholder: "https://example.com",
      validation: zodValidator(urlSchema),
    },
    {
      key: "phone",
      label: "Phone",
      type: "text",
      icon: () => <Phone class="size-3.5" />,
      placeholder: "+1234567890",
      validation: zodValidator(phoneSchema),
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      icon: () => <User class="size-3.5" />,
      class: "w-44",
      placeholder: "john_doe",
      validation: zodValidator(usernameSchema),
    },
    {
      key: "cardNumber",
      label: "Card Number",
      type: "text",
      icon: () => <CreditCard class="size-3.5" />,
      placeholder: "4111111111111111",
      validation: zodValidator(creditCardSchema),
    },
    {
      key: "customUrl",
      label: "Custom URL",
      type: "text",
      icon: () => <Link class="size-3.5" />,
      placeholder: "https://...",
      // A plain function works just as well as a schema library.
      validation: (value) => {
        if (!/^https?:\/\/.+\..+/.test(value as string)) {
          return { valid: false, message: "URL must start with http:// or https://" };
        }
        return { valid: true };
      },
    },
  ];

  const [filters, setFilters] = createSignal<Filter[]>([createFilter("email", "contains", [""])]);

  return (
    <div class="flex grow content-start items-start self-start">
      <Filters filters={filters()} fields={fields} onChange={setFilters} />
    </div>
  );
}
