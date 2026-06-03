"use client";

import { useState, useRef, useEffect } from "react";
import { CaretDown } from "@phosphor-icons/react";

type Option = { value: string; label: string; sublabel?: string; rightMeta?: { label: string; logo_url?: string | null } };

export default function SearchSelect({
  name,
  options: initialOptions,
  defaultValue,
  placeholder = "Zoeken...",
  required,
  onChange,
  onCreateNew,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (value: string | undefined) => void;
  onCreateNew?: (query: string) => Promise<Option | null>;
}) {
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const defaultOption = options.find((o) => o.value === defaultValue) ?? null;
  const [selected, setSelected] = useState<Option | null>(defaultOption);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState<number>(-1);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleOpen() {
    setOpen(true);
    setQuery("");
    setHighlighted(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(option: Option) {
    setSelected(option);
    setOpen(false);
    setQuery("");
    setHighlighted(-1);
    onChange?.(option.value);
  }

  async function handleCreateNew() {
    if (!onCreateNew || !query.trim() || creating) return;
    setCreating(true);
    const newOption = await onCreateNew(query.trim());
    setCreating(false);
    if (newOption) {
      setOptions((prev) => [...prev, newOption]);
      handleSelect(newOption);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && filtered[highlighted]) {
        handleSelect(filtered[highlighted]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected?.value ?? ""} required={required} />

      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full px-3 py-2 text-sm rounded-md text-left flex items-center justify-between"
        style={{
          background: "var(--bg-secondary)",
          border: `1px solid ${open ? "var(--text-heading)" : "var(--border)"}`,
          color: selected ? "var(--text)" : "var(--text-muted)",
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <CaretDown size={14} weight="bold" className="flex-shrink-0 ml-2" style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-md overflow-hidden"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
        >
          {/* Search input */}
          <div className="p-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlighted(-1); }}
              onKeyDown={handleKeyDown}
              placeholder="Zoeken..."
              className="w-full px-2.5 py-1.5 text-sm rounded-md outline-none"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto" ref={listRef}>
            {filtered.length > 0 ? filtered.map((option, idx) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors"
                style={{
                  color: "var(--text)",
                  background: highlighted === idx ? "var(--bg-hover)" : selected?.value === option.value ? "var(--bg-hover)" : "transparent",
                  fontWeight: selected?.value === option.value ? 500 : 400,
                }}
              >
                <span className="flex items-center gap-2">
                  {option.label}
                  {option.sublabel && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{option.sublabel}</span>
                  )}
                </span>
                {option.rightMeta && (
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className="w-4 h-4 rounded overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
                    >
                      {option.rightMeta.logo_url ? (
                        <img src={option.rightMeta.logo_url} alt={option.rightMeta.label} className="w-full h-full object-contain" />
                      ) : (
                        <span style={{ fontSize: "8px", color: "var(--text-muted)", fontWeight: 600 }}>
                          {option.rightMeta.label.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{option.rightMeta.label}</span>
                  </span>
                )}
              </button>
            )) : (
              <p className="px-3 py-3 text-sm" style={{ color: "var(--text-muted)" }}>Geen resultaten</p>
            )}
            {onCreateNew && query.trim() && filtered.length === 0 && (
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={creating}
                className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors"
                style={{ color: "var(--text-heading)", borderTop: "1px solid var(--border)", fontWeight: 500, opacity: creating ? 0.6 : 1 }}
              >
                {creating ? "Aanmaken..." : `+ "${query.trim()}" aanmaken`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
