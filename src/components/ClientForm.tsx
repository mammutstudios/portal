"use client";

import { useState, useRef } from "react";
import { ImageSquare } from "@phosphor-icons/react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { createClientAction, updateClientAction } from "@/lib/actions/clients";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/types";

function isEmoji(val: string) {
  return !val.startsWith("http") && !val.startsWith("/") && !val.startsWith("data:");
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function ClientForm({
  client,
  onClose,
}: {
  client?: Client;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const existingLogo = client?.logo_url ?? null;
  const [logoMode, setLogoMode] = useState<"image" | "emoji">(
    existingLogo && isEmoji(existingLogo) ? "emoji" : "image"
  );
  const [preview, setPreview] = useState<string | null>(existingLogo);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(
    existingLogo && isEmoji(existingLogo) ? existingLogo : null
  );
  const [tag, setTag] = useState<string>(client?.tag ?? "client");
  const [slug, setSlug] = useState<string>(client?.slug ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const isEdit = !!client;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = isEdit
      ? await updateClientAction(client.id, formData)
      : await createClientAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Logo */}
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>Logo</label>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-3">
          {(["image", "emoji"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setLogoMode(mode);
                setPreview(null);
                setSelectedEmoji(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="px-3 py-1 rounded-md text-xs"
              style={{
                border: `1px solid ${logoMode === mode ? "var(--text-heading)" : "var(--border)"}`,
                background: logoMode === mode ? "var(--text-heading)" : "transparent",
                color: logoMode === mode ? "#fff" : "var(--text-muted)",
                fontWeight: logoMode === mode ? 600 : 400,
              }}
            >
              {mode === "image" ? "Afbeelding" : "Emoji"}
            </button>
          ))}
        </div>

        {logoMode === "image" ? (
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
            >
              {preview ? (
                <img src={preview} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ImageSquare size={20} style={{ color: "var(--text-muted)" }} />
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm px-3 py-1.5 rounded-md"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                {preview ? "Wijzigen" : "Uploaden"}
              </button>
              <input
                ref={fileRef}
                name="logo"
                type="file"
                accept="image/*, image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPreview(URL.createObjectURL(file));
                }}
              />
              {preview && (
                <button
                  type="button"
                  className="ml-2 text-sm px-3 py-1.5 rounded-md"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => {
                    setPreview(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Verwijderen
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <input type="hidden" name="emoji" value={selectedEmoji ?? ""} />
            {selectedEmoji && (
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center text-3xl"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
                >
                  {selectedEmoji}
                </div>
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 rounded-md"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => setSelectedEmoji(null)}
                >
                  Verwijderen
                </button>
              </div>
            )}
            <Picker
              data={data}
              onEmojiSelect={(e: { native: string }) => setSelectedEmoji(e.native)}
              locale="nl"
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
              set="native"
            />
          </div>
        )}
      </div>

      {/* Type — Client first, default */}
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>Type</label>
        <input type="hidden" name="tag" value={tag} />
        <div className="flex gap-2">
          {(["client", "agency"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTag(option)}
              className="px-3 py-1.5 rounded-md text-sm transition-colors"
              style={{
                border: `1px solid ${tag === option ? "var(--text-heading)" : "var(--border)"}`,
                background: tag === option ? "var(--text-heading)" : "transparent",
                color: tag === option ? "#fff" : "var(--text-muted)",
                fontWeight: tag === option ? 500 : 400,
              }}
            >
              {option === "agency" ? "Agency" : "Client"}
            </button>
          ))}
        </div>
      </div>

      {/* Naam — auto-generates slug */}
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>
          Naam <span style={{ color: "#c0392b" }}>*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          autoFocus
          defaultValue={client?.name ?? ""}
          placeholder="Klantnaam"
          className="w-full px-3 py-2 text-sm rounded-md outline-none"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
          onChange={(e) => {
            if (!isEdit) setSlug(toSlug(e.target.value));
          }}
        />
      </div>

      {/* Client ID */}
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>Client ID</label>
        <input
          name="client_number"
          type="text"
          defaultValue={client?.client_number ?? ""}
          placeholder="Bijv. MMT"
          className="w-full px-3 py-2 text-sm rounded-md outline-none"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      </div>

      {/* Slug — hidden, auto-generated */}
      <input type="hidden" name="slug" value={slug} />

      {error && <p className="text-sm" style={{ color: "#c0392b" }}>{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="text-sm px-3 py-1.5" style={{ color: "var(--text-muted)" }}>
          Annuleren
        </button>
        <button
          type="submit"
          disabled={loading}
          className="text-sm px-4 py-1.5 rounded-md font-medium disabled:opacity-50"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          {loading ? "Opslaan…" : isEdit ? "Opslaan" : "Klant aanmaken"}
        </button>
      </div>
    </form>
  );
}
