import { Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { AppButton } from "@/components/AppButton"

// Standard footer action row for forms: a Cancel button, an optional Delete
// button (edit mode), and the primary submit (Create / Save changes). Groups the
// buttons consistently so every form shares the same layout and labels.
interface FormActionsProps {
  /** Edit mode toggles the primary label and reveals Delete. */
  editing?: boolean
  /** Cancel handler (usually the discard-changes flow). */
  onCancel: () => void
  /** Submit spinner state. The button is a native form submit. */
  saving?: boolean
  /** Show the destructive Delete button (typically editing && canDelete). */
  showDelete?: boolean
  onDelete?: () => void
  /** Override the primary button label; defaults to Create / Save changes. */
  submitLabel?: string
}

export function FormActions({
  editing = false,
  onCancel,
  saving = false,
  showDelete = false,
  onDelete,
  submitLabel,
}: FormActionsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex justify-end gap-2">
      <AppButton type="button" variant="outline" onClick={onCancel}>
        {t("common.cancel")}
      </AppButton>
      {showDelete && (
        <AppButton type="button" variant="destructive" icon={Trash2} onClick={onDelete}>
          {t("common.delete")}
        </AppButton>
      )}
      <AppButton
        type="submit"
        loading={saving}
        loadingText={editing ? t("common.saving") : t("common.creating")}
      >
        {submitLabel ?? (editing ? t("common.saveChanges") : t("common.create"))}
      </AppButton>
    </div>
  )
}
