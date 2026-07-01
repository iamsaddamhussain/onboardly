import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "@/locales/en.json"
import fr from "@/locales/fr.json"

export const SUPPORTED_LANGUAGES = ["en", "fr"] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = "onboardly-language"

// The language the app starts in, before the signed-in user's preference (from
// the API) is applied. Falls back to the stored choice, then English.
function initialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)
    ? (stored as Language)
    : "en"
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: initialLanguage(),
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
})

// Switch the active UI language and remember the choice locally so the next
// visit starts in the same language even before the API responds.
export function setLanguage(language: Language) {
  localStorage.setItem(STORAGE_KEY, language)
  void i18n.changeLanguage(language)
}

export default i18n
