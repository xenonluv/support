type ClipboardLike = { writeText(text: string): Promise<void> };

/** 텍스트를 클립보드에 복사한다. 클립보드를 쓸 수 없거나 브라우저가 거부하면 false. */
export async function copyText(
  text: string,
  clipboard: ClipboardLike | null = defaultClipboard(),
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function defaultClipboard(): ClipboardLike | null {
  return typeof navigator !== "undefined" && navigator.clipboard ? navigator.clipboard : null;
}
