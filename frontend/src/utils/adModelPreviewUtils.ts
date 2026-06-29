export const hexToRgb = (hex: string): string | null => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}` : null;
};

export   const getContrastText = (hex: string) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

    return luminance > 186 ? "#000000" : "#ffffff";
  };

  