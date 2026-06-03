/**
 * Renders a client logo — either an image URL or an emoji string.
 * An emoji is detected by checking if the value starts with "http" or "/".
 */
export function isEmoji(value: string) {
  return !value.startsWith("http") && !value.startsWith("/") && !value.startsWith("data:");
}

export default function ClientLogo({
  logo_url,
  name,
  size = "sm",
}: {
  logo_url: string | null | undefined;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions = size === "lg" ? "w-16 h-16" : size === "md" ? "w-10 h-10" : "w-6 h-6";
  const textSize = size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-xs";

  return (
    <div
      className={`${dimensions} rounded flex items-center justify-center flex-shrink-0 overflow-hidden`}
      style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
    >
      {logo_url ? (
        isEmoji(logo_url) ? (
          <span className={textSize}>{logo_url}</span>
        ) : (
          <img src={logo_url} alt={name} className="w-full h-full object-contain" />
        )
      ) : (
        <span className={`font-medium ${textSize}`} style={{ color: "var(--text-muted)" }}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
