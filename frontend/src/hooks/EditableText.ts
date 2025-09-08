import { useState } from "react";

export function useEditable<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  return {
    value,
    isEditing,
    setValue,
    setIsEditing,
    toggle: () => setIsEditing(!isEditing),
  };
}
