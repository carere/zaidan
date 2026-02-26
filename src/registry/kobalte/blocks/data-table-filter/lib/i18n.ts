import de from "../locales/de.json";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import nl from "../locales/nl.json";
import zhCN from "../locales/zh-CN.json";
import zhTW from "../locales/zh-TW.json";

export type Locale = "en" | "de" | "fr" | "nl" | "zh-CN" | "zh-TW";

type Translations = Record<string, string>;

const translations: Record<Locale, Translations> = {
  en,
  de,
  fr,
  nl,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

export function t(key: string, locale: Locale): string {
  return translations[locale][key] ?? key;
}
