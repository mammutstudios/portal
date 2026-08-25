/**
 * Het Mammut-merk als vierkant app-icoon: ink vlak met het mammoetmerk in
 * lavendel. Dezelfde tekening als het favicon en de webclip, zodat het portaal
 * op een tabblad, een beginscherm en linksboven in de app hetzelfde gezicht
 * heeft.
 *
 * De afronding komt van CSS en niet uit de SVG, zodat hij dezelfde
 * squircle-vorm krijgt als de kaarten in plaats van een gewone ronde hoek.
 */
export default function MammutMark({
  size = 28,
  className,
  style,
}: {
  /** In pixels. Bewust hier en niet via een klasse: dan kan hij nooit
   *  uitdijen als de stylesheet achterloopt of een maat vergeten wordt. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`squircle-icon inline-flex overflow-hidden flex-shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size, background: "#140018", ...style }}
    >
      <svg viewBox="0 0 1020 1020" role="img" aria-label="Mammut Studios" style={{ width: "100%", height: "100%" }}>
        <path d="M739.631 509.539C768.538 429.731 777.602 359.631 767.371 319.802C761.758 297.716 750.185 284.938 732.826 284.938H730.864V284.988C713.902 285.912 693.836 298.539 673 319.802C663.24 329.759 653.306 341.613 643.447 355.039C627.851 376.276 612.429 401.481 598.149 429.332C585.384 454.238 573.539 481.29 563.282 509.539H550.865C579.772 429.731 588.811 359.631 578.605 319.802C572.968 297.716 561.394 284.938 544.035 284.938C526.676 284.938 505.865 297.716 484.234 319.802C445.169 359.631 403.448 429.731 374.54 509.539H362.124C391.03 429.731 400.07 359.631 389.864 319.802C384.226 297.716 372.653 284.938 355.294 284.938C306.644 284.938 230.75 385.485 185.824 509.539H280.195C251.288 589.348 242.248 659.448 252.455 699.278C258.092 721.363 269.665 734.14 287.024 734.14C304.383 734.14 325.194 721.363 346.825 699.278C385.89 659.448 427.612 589.348 456.519 509.539H468.936C440.029 589.348 430.989 659.448 441.196 699.278C446.834 721.363 458.406 734.14 475.765 734.14C493.125 734.14 513.936 721.363 535.566 699.278C555.509 678.938 576.146 650.714 595.392 617.348C613.87 585.33 631.104 548.62 645.26 509.539H657.678C628.77 589.348 619.73 659.448 629.938 699.278C635.575 721.363 647.122 734.14 664.482 734.14C681.841 734.14 702.677 721.363 724.308 699.278C763.372 659.448 805.094 589.348 834.001 509.539H739.631Z" fill="#DBE8FB" />
      </svg>
    </span>
  );
}
