// Official Indian veg / non-veg / egg mark: dot inside a square border.
export default function DietMark({ diet, size = 14 }: { diet: string; size?: number }) {
  const veg = diet === "veg";
  const egg = diet === "egg";
  const color = veg ? "#15803d" : egg ? "#b45309" : "#b91c1c";
  return (
    <span
      aria-label={veg ? "Vegetarian" : egg ? "Eggetarian" : "Non-vegetarian"}
      title={veg ? "Vegetarian" : egg ? "Eggetarian" : "Non-vegetarian"}
      className="inline-flex shrink-0 items-center justify-center rounded-[3px] border-[1.5px] bg-white"
      style={{ width: size, height: size, borderColor: color }}
    >
      <span
        className="block rounded-full"
        style={{
          width: size * 0.42,
          height: size * 0.42,
          backgroundColor: color,
          clipPath: egg ? "polygon(0 0, 100% 0, 0 100%)" : undefined,
        }}
      />
    </span>
  );
}
