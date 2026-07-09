import dayjs from "dayjs"
import localizedFormat from "dayjs/plugin/localizedFormat"
import "dayjs/locale/en"
import "dayjs/locale/fr"

import i18n from "@/lib/i18n"

dayjs.extend(localizedFormat)

// Keep dayjs' active locale in sync with the app language so dates render in
// the user's language (dayjs is used over Intl because of its i18n support).
dayjs.locale(i18n.language)
i18n.on("languageChanged", (language) => {
  dayjs.locale(language)
})

// Medium date, e.g. "Jul 8, 2026" / "8 juil. 2026".
export function formatDate(iso: string) {
  return dayjs(iso).format("ll")
}

// Long date, e.g. "July 8, 2026" / "8 juillet 2026".
export function formatLongDate(iso: string) {
  return dayjs(iso).format("LL")
}

// Medium date with time, e.g. "Jul 8, 2026 2:30 PM".
export function formatDateTime(iso: string) {
  return dayjs(iso).format("lll")
}
