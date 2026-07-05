// Base component all server-side lookups / ajax typeaheads build on. Mirrors the
// behaviour of a Quasar q-select with use-input + @filter: as the user types we
// debounce and call `queryCallback(term)` to fetch matches from the server, with
// support for single/multiple selection, a minimum search length, clearing, and
// binding to either the selected object(s) or just their id(s).
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import { ChevronDown, Loader2, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

// Any option shape; the value/label are read via optionValue/optionLabel.
type Option = Record<string, unknown>

interface ServersideLookupProps<T> {
  // Selected object (single) or array of objects (multiple).
  value: T | T[] | null
  onChange: (value: T | T[] | null) => void
  // Optionally mirror the selection down to just its id(s), like the Quasar
  // component's `id` model. Fired alongside onChange.
  onIdChange?: (id: number | number[] | null) => void
  // Perform the query to get search results from the server (given the term).
  queryCallback: (term: string) => Promise<T[]>
  // Min characters the user must enter before a search runs.
  minLength?: number
  // Property used as the option's value/identity.
  optionValue?: string
  // Custom label renderer; defaults to name/label/value on the option.
  optionLabel?: (item: T) => string
  multiple?: boolean
  // i18n key for the idle placeholder.
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  "aria-invalid"?: boolean
}

export function ServersideLookup<T>({
  value,
  onChange,
  onIdChange,
  queryCallback,
  minLength = 0,
  optionValue = "id",
  optionLabel,
  multiple = false,
  placeholder,
  disabled,
  className,
  id,
  "aria-invalid": ariaInvalid,
}: ServersideLookupProps<T>) {
  const { t } = useTranslation()
  const [inputText, setInputText] = useState("")
  const [options, setOptions] = useState<T[]>([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Guards against out-of-order responses overwriting a newer search.
  const queryIdRef = useRef(0)

  const getVal = (item: T) => (item as Option)[optionValue]
  const labelOf = (item: T) => {
    if (optionLabel) return optionLabel(item)
    const o = item as Option
    return String(o.name ?? o.label ?? o[optionValue] ?? "")
  }

  const selectedArray = multiple && Array.isArray(value) ? value : []
  const selectedSingle = !multiple && value && !Array.isArray(value) ? (value as T) : null
  const hasValue = multiple ? selectedArray.length > 0 : !!selectedSingle

  // Keep the single-select input showing the current selection's label when the
  // user isn't actively typing/searching.
  const singleKey = selectedSingle ? String(getVal(selectedSingle)) : ""
  useEffect(() => {
    if (!multiple) setInputText(selectedSingle ? labelOf(selectedSingle) : "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleKey, multiple])

  // Close the dropdown when clicking outside the component.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  function emit(next: T | T[] | null) {
    onChange(next)
    if (onIdChange) {
      if (next == null) onIdChange(multiple ? [] : null)
      else if (Array.isArray(next)) onIdChange(next.map((o) => Number(getVal(o))))
      else onIdChange(Number(getVal(next)))
    }
  }

  function runQuery(term: string) {
    if (term.length < minLength) {
      setOptions([])
      return
    }
    const queryId = ++queryIdRef.current
    setLoading(true)
    queryCallback(term)
      .then((res) => {
        if (queryId === queryIdRef.current) {
          setOptions(res)
          setHighlight(0)
        }
      })
      .catch(() => {
        if (queryId === queryIdRef.current) setOptions([])
      })
      .finally(() => {
        if (queryId === queryIdRef.current) setLoading(false)
      })
  }

  function handleInput(v: string) {
    setInputText(v)
    setOpen(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runQuery(v), 250)
  }

  function handleFocus() {
    setFocused(true)
    setOpen(true)
    // Show the initial matches straight away (Quasar triggers @filter on focus).
    runQuery(multiple ? inputText : "")
    if (!multiple) requestAnimationFrame(() => inputRef.current?.select())
  }

  function selectOption(opt: T) {
    if (multiple) {
      const exists = selectedArray.some((o) => getVal(o) === getVal(opt))
      if (!exists) emit([...selectedArray, opt])
      // Autoclose + clear the input, mirroring the Quasar behaviour.
      setInputText("")
      setOptions([])
      setOpen(false)
    } else {
      emit(opt)
      setInputText(labelOf(opt))
      setOpen(false)
    }
    inputRef.current?.blur()
  }

  function removeChip(opt: T) {
    emit(selectedArray.filter((o) => getVal(o) !== getVal(opt)))
  }

  function clearAll() {
    emit(multiple ? [] : null)
    setInputText("")
    setOptions([])
    inputRef.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, options.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter") {
      if (open && options[highlight]) {
        e.preventDefault()
        selectOption(options[highlight])
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    } else if (e.key === "Backspace" && multiple && !inputText && selectedArray.length) {
      removeChip(selectedArray[selectedArray.length - 1])
    }
  }

  const activePlaceholder = useMemo(() => {
    if (focused) {
      return t(multiple && hasValue ? "lookup.searchAnother" : "lookup.typeToSearch")
    }
    if (hasValue && !multiple) return undefined
    return placeholder ? t(placeholder) : undefined
  }, [focused, multiple, hasValue, placeholder, t])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "border-input flex min-h-9 w-full flex-wrap items-center gap-1 border bg-transparent px-2 py-1 text-sm shadow-xs transition-[color,box-shadow]",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
          ariaInvalid && "ring-destructive/20 border-destructive",
        )}
        aria-invalid={ariaInvalid}
      >
        {multiple &&
          selectedArray.map((opt) => (
            <span
              key={String(getVal(opt))}
              className="inline-flex items-center gap-1 rounded-none bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
            >
              {labelOf(opt)}
              <button
                type="button"
                className="cursor-pointer text-muted-foreground/70 hover:text-foreground"
                onClick={() => removeChip(opt)}
                aria-label="Remove"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        <input
          ref={inputRef}
          id={id}
          className="placeholder:text-muted-foreground min-w-24 flex-1 bg-transparent px-1 py-0.5 outline-none disabled:cursor-not-allowed"
          value={inputText}
          disabled={disabled}
          placeholder={activePlaceholder}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={onKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-listbox` : undefined}
        />
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        {hasValue && !disabled ? (
          <button
            type="button"
            className="shrink-0 cursor-pointer text-muted-foreground/70 hover:text-foreground"
            onClick={clearAll}
            aria-label="Clear"
          >
            <X className="size-4" />
          </button>
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground/70" />
        )}
      </div>

      {open && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto border bg-popover text-popover-foreground shadow-md"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {loading ? t("lookup.searching") : t("lookup.noResults")}
            </li>
          ) : (
            options.map((opt, i) => {
              const isSelected = multiple
                ? selectedArray.some((o) => getVal(o) === getVal(opt))
                : selectedSingle != null && getVal(selectedSingle) === getVal(opt)
              return (
                <li
                  key={String(getVal(opt))}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm",
                    i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                    isSelected && "font-medium",
                  )}
                  onMouseEnter={() => setHighlight(i)}
                  // onMouseDown (not onClick) so the input's blur doesn't close
                  // the list before the selection registers.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectOption(opt)
                  }}
                >
                  {labelOf(opt)}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
