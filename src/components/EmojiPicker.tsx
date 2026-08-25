"use client";

import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

/**
 * De emoji-kiezer, apart gezet zodat hij lui geladen kan worden.
 *
 * Deze twee imports zijn samen de grootste brok JavaScript van de hele app:
 * 110 KB gzip, vrijwel helemaal de emoji-dataset. Stonden ze rechtstreeks in
 * ClientForm, dan haalde elke bezoeker van de klantenpagina's ze binnen, ook
 * wie nooit een emoji kiest. Via next/dynamic komt dat pas over de lijn op het
 * moment dat de kiezer echt opengaat.
 */
export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <Picker
      data={data}
      onEmojiSelect={(e: { native: string }) => onSelect(e.native)}
      locale="nl"
      theme="light"
      previewPosition="none"
      skinTonePosition="none"
      set="native"
    />
  );
}
