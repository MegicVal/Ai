import it from "@messages/it.json";
import en from "@messages/en.json";

/**
 * To add a language: add its code here, add `messages/<code>.json`, and add the
 * new key to the localized fields in `content/`. Missing keys fall back to Italian.
 */
export const locales = ["it", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "it";

export type Dictionary = typeof it;
const dictionaries: Record<Locale, Dictionary> = { it, en };

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

/** A text that exists in Italian and, optionally, in the other languages. */
export type Localized = { it: string } & Partial<Record<Locale, string>>;

export const tr = (value: Localized | string, locale: Locale): string =>
  typeof value === "string" ? value : (value[locale] ?? value[defaultLocale]);

export const href = (locale: Locale, path = ""): string => `/${locale}${path}`;

export const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
