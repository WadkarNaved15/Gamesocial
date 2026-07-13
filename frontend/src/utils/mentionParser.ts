import { Coordinates } from "../types/mention";

export const getActiveMention = (
  text: string,
  cursorPosition: number
): { query: string; startIndex: number } | null => {
  const textBeforeCursor = text.slice(0, cursorPosition);
  const mentionMatch = /(?:^|[\s,("'\n])@([a-zA-Z0-9_]*)$/.exec(textBeforeCursor);
  
  if (mentionMatch) {
    const query = mentionMatch[1];
    const startIndex = cursorPosition - query.length - 1;
    return { query, startIndex };
  }
  return null;
};

export const replaceMention = (
  text: string,
  startIndex: number,
  cursorPosition: number,
  username: string
): { newText: string; newCursorPosition: number } => {
  const textBefore = text.slice(0, startIndex);
  const textAfter = text.slice(cursorPosition);
  const insertedText = `@${username} `;
  const newText = `${textBefore}${insertedText}${textAfter}`;
  const newCursorPosition = startIndex + insertedText.length;
  
  return { newText, newCursorPosition };
};

// ARCHITECTURAL CHANGE: Reusable mirror div prevents continuous DOM creation/destruction
let mirrorDiv: HTMLDivElement | null = null;

export const getCaretCoordinates = (
  element: HTMLTextAreaElement,
  position: number // We now track the CURRENT cursor position, not the start index
): Coordinates => {
  if (!mirrorDiv) {
    mirrorDiv = document.createElement("div");
    document.body.appendChild(mirrorDiv);
  }

  const computed = window.getComputedStyle(element);
  const properties = [
    "direction", "boxSizing", "width", "height", "overflowX", "overflowY",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "borderStyle", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize",
    "fontSizeAdjust", "lineHeight", "fontFamily", "textAlign", "textTransform",
    "textIndent", "textDecoration", "letterSpacing", "wordSpacing", "tabSize", "MozTabSize"
  ];

  mirrorDiv.style.position = "absolute";
  mirrorDiv.style.top = "-9999px";
  mirrorDiv.style.left = "-9999px";
  mirrorDiv.style.whiteSpace = "pre-wrap";
  mirrorDiv.style.wordWrap = "break-word";
  mirrorDiv.style.visibility = "hidden"; // Keep invisible

  properties.forEach((prop) => {
    (mirrorDiv!.style as any)[prop] = computed[prop as any];
  });

  // Calculate coordinates up to the exact current cursor position
  mirrorDiv.textContent = element.value.substring(0, position);
  
  const span = document.createElement("span");
  span.textContent = "\u200B";
  mirrorDiv.appendChild(span);

  // ARCHITECTURAL CHANGE: Calculate viewport-relative coordinates for `position: fixed`
  const rect = element.getBoundingClientRect();
  const lineHeight = parseInt(computed.lineHeight) || 20;

  const coordinates = {
    // Viewport Top = Textarea top + Caret local top - Textarea scroll offset + Caret height
    top: rect.top + span.offsetTop - element.scrollTop + lineHeight,
    // Viewport Left = Textarea left + Caret local left - Textarea scroll offset
    left: rect.left + span.offsetLeft - element.scrollLeft,
    height: lineHeight,
  };

  mirrorDiv.removeChild(span); // Cleanup just the span
  return coordinates;
};