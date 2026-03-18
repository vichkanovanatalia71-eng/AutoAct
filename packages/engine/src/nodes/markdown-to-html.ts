export async function markdownToHtmlHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  let markdown: string;
  if (typeof config.markdown === "string") {
    markdown = config.markdown;
  } else if (typeof config.data === "string") {
    markdown = config.data;
  } else if (typeof config.field === "string") {
    const fieldValue = context[config.field];
    if (typeof fieldValue !== "string") {
      throw new Error(`Field "${config.field}" is not a string or does not exist in input`);
    }
    markdown = fieldValue;
  } else {
    throw new Error("config.markdown, config.data, or config.field must be provided");
  }

  const html = convertMarkdownToHtml(markdown);

  return { html };
}

function convertMarkdownToHtml(md: string): string {
  let html = md;

  // Fenced code blocks (```...```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : "";
    return `<pre><code${langAttr}>${escapeHtml(code.trimEnd())}</code></pre>`;
  });

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    return `<code>${escapeHtml(code)}</code>`;
  });

  // Process block-level elements line by line
  const lines = html.split("\n");
  const outputLines: string[] = [];
  let inList: "ul" | "ol" | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip lines that are part of pre blocks (already processed)
    if (line.includes("<pre>") || line.includes("</pre>")) {
      if (inList) {
        outputLines.push(inList === "ul" ? "</ul>" : "</ol>");
        inList = null;
      }
      outputLines.push(line);
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (inList) {
        outputLines.push(inList === "ul" ? "</ul>" : "</ol>");
        inList = null;
      }
      const level = headerMatch[1].length;
      const content = processInline(headerMatch[2]);
      outputLines.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      if (inList) {
        outputLines.push(inList === "ul" ? "</ul>" : "</ol>");
        inList = null;
      }
      outputLines.push("<hr>");
      continue;
    }

    // Unordered list items
    const ulMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inList !== "ul") {
        if (inList) outputLines.push("</ol>");
        outputLines.push("<ul>");
        inList = "ul";
      }
      outputLines.push(`<li>${processInline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list items
    const olMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList !== "ol") {
        if (inList) outputLines.push("</ul>");
        outputLines.push("<ol>");
        inList = "ol";
      }
      outputLines.push(`<li>${processInline(olMatch[1])}</li>`);
      continue;
    }

    // Close any open list
    if (inList) {
      outputLines.push(inList === "ul" ? "</ul>" : "</ol>");
      inList = null;
    }

    // Blockquote
    const bqMatch = line.match(/^>\s*(.*)$/);
    if (bqMatch) {
      outputLines.push(`<blockquote>${processInline(bqMatch[1])}</blockquote>`);
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      outputLines.push("");
      continue;
    }

    // Regular paragraph
    outputLines.push(`<p>${processInline(line)}</p>`);
  }

  // Close any remaining open list
  if (inList) {
    outputLines.push(inList === "ul" ? "</ul>" : "</ol>");
  }

  return outputLines.join("\n");
}

function processInline(text: string): string {
  // Images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Links [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic *text* or _text_
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>");

  // Strikethrough ~~text~~
  text = text.replace(/~~(.+?)~~/g, "<del>$1</del>");

  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
