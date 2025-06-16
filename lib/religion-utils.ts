export const getReligionIcon = (religion: string) => {
  switch (religion) {
    case "lutheran":
      return "place-of-worship"
    case "judaism":
    case "jewish":
      return "synagogue"
    case "orthodox":
    case "roman_catholic":
    case "greek_catholic":
    default:
      return "church"
  }
}

export const getReligionLabel = (religion: string) => {
  const labelMap: { [key: string]: string } = {
    greek_catholic: "Греко-католицька",
    roman_catholic: "Римо-католицька",
    orthodox: "Православна",
    lutheran: "Лютеранська",
    judaism: "Іудаїзм",
    jewish: "Іудаїзм",
  }
  return labelMap[religion] || religion
}

export const getReligionColor = (religion: string) => {
  const colorMap: { [key: string]: string } = {
    orthodox: "#FFD700", // Золотий
    roman_catholic: "#C8102E", // Червоний
    greek_catholic: "#007FFF", // Блакитний
    judaism: "#00388F", // Темно-синій
    jewish: "#00388F", // Темно-синій
    lutheran: "#228B22", // Зелений
  }
  return colorMap[religion] || "#6B7280" // Сірий за замовчуванням
}

export const getReligionColorClass = (religion: string) => {
  // Для використання в Tailwind класах (fallback)
  const colorMap: { [key: string]: string } = {
    orthodox: "text-yellow-500",
    roman_catholic: "text-red-600",
    greek_catholic: "text-blue-500",
    judaism: "text-blue-800",
    jewish: "text-blue-800",
    lutheran: "text-green-600",
  }
  return colorMap[religion] || "text-gray-600"
}
