import { createHash } from "node:crypto";
import { prisma } from "@autoact/db";

interface ParsedTemplate {
  name: string;
  description?: string;
  category: string;
  tags: string[];
  author?: string;
  triggerType: string;
  requiredCredentials: string[];
  nodes: any[];
  rawJson: any;
}

async function fetchAndParseJson(url: string): Promise<ParsedTemplate> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON from ${url}: ${response.status} ${response.statusText}`);
  }

  const rawJson = await response.json();

  const name = rawJson.name || rawJson.title || "Untitled Workflow";
  const description = rawJson.description || rawJson.desc || undefined;
  const category = rawJson.category || rawJson.group || "Інше";
  const tags: string[] = Array.isArray(rawJson.tags) ? rawJson.tags : [];
  const author = rawJson.author || rawJson.created_by || undefined;

  // Extract trigger type from nested structures
  const triggerType =
    rawJson.trigger?.type ||
    rawJson.trigger_type ||
    rawJson.triggerType ||
    "manual";

  const requiredCredentials: string[] = Array.isArray(rawJson.required_credentials)
    ? rawJson.required_credentials
    : Array.isArray(rawJson.requiredCredentials)
      ? rawJson.requiredCredentials
      : [];

  // Extract nodes from various possible structures
  const nodes: any[] = Array.isArray(rawJson.nodes)
    ? rawJson.nodes
    : Array.isArray(rawJson.steps)
      ? rawJson.steps
      : [];

  return {
    name,
    description,
    category,
    tags,
    author,
    triggerType,
    requiredCredentials,
    nodes,
    rawJson,
  };
}

async function generateCoverImage(
  name: string,
  description: string,
  credentials: string[],
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

    const prompt = `Create a professional cover image for a workflow automation tool called "${name}". The workflow does: ${description || "automates tasks"}. It uses these services: ${credentials.join(", ")}. Style: modern, tech-inspired, flat design with gradients, abstract. No text on the image. 1024x576 resolution.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    // Check if there's an inline image in the response parts
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if ((part as any).inlineData) {
        const inlineData = (part as any).inlineData;
        return `data:${inlineData.mimeType};base64,${inlineData.data}`;
      }
    }
    return null;
  } catch (err) {
    console.error("[template-creator] Gemini cover generation failed:", err);
    return null;
  }
}

function generateDiagramSvg(nodes: any[]): string {
  const nodeWidth = 180;
  const nodeHeight = 50;
  const gap = 30;
  const padding = 20;
  const totalHeight = padding * 2 + nodes.length * (nodeHeight + gap) - gap;
  const totalWidth = nodeWidth + padding * 2;

  const colors: Record<string, string> = {
    http_request: "#3b82f6",
    condition: "#f59e0b",
    transform: "#10b981",
    email: "#8b5cf6",
    set_variable: "#6366f1",
    delay: "#64748b",
    loop: "#ec4899",
    webhook: "#06b6d4",
    cron: "#84cc16",
  };

  let svgContent = "";
  nodes.forEach((node, i) => {
    const x = padding;
    const y = padding + i * (nodeHeight + gap);
    const color = colors[node.type] || "#6b7280";
    const nodeType = escapeXml(String(node.type || "unknown"));
    const nodeId = escapeXml(String(node.id || `node-${i}`));

    // Rectangle
    svgContent += `<rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="8" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5"/>`;
    // Type label
    svgContent += `<text x="${x + 12}" y="${y + 20}" font-size="10" fill="${color}" font-weight="600">${nodeType}</text>`;
    // Node id
    svgContent += `<text x="${x + 12}" y="${y + 36}" font-size="11" fill="#374151">${nodeId}</text>`;

    // Arrow to next
    if (i < nodes.length - 1) {
      const arrowY = y + nodeHeight;
      const midX = x + nodeWidth / 2;
      svgContent += `<line x1="${midX}" y1="${arrowY}" x2="${midX}" y2="${arrowY + gap}" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#arrow)"/>`;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af"/></marker></defs>
  ${svgContent}
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function createTemplateFromUrl(jsonUrl: string) {
  const parsed = await fetchAndParseJson(jsonUrl);

  const coverImageUrl = await generateCoverImage(
    parsed.name,
    parsed.description || "",
    parsed.requiredCredentials,
  );

  const diagramSvg = generateDiagramSvg(parsed.nodes);
  const diagramDataUrl = `data:image/svg+xml;base64,${Buffer.from(diagramSvg).toString("base64")}`;

  // Compute SHA-256 checksum of the raw JSON
  const rawJsonString = JSON.stringify(parsed.rawJson);
  const checksum = createHash("sha256").update(rawJsonString).digest("hex");

  const template = await prisma.workflowTemplate.create({
    data: {
      name: parsed.name,
      description: parsed.description ?? null,
      category: parsed.category,
      tags: parsed.tags,
      author: parsed.author ?? null,
      triggerType: parsed.triggerType,
      requiredCredentials: parsed.requiredCredentials,
      definition: parsed.rawJson,
      rawJson: parsed.rawJson,
      nodeCount: parsed.nodes.length,
      coverImageUrl: coverImageUrl,
      diagramUrl: diagramDataUrl,
      jsonUrl,
      jsonUrlChecksum: checksum,
      jsonUrlLastSyncedAt: new Date(),
      version: 1,
      syncStatus: "idle",
    },
  });

  return template;
}

export { fetchAndParseJson, generateCoverImage, generateDiagramSvg, createTemplateFromUrl };
