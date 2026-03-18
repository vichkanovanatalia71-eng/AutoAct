import { prisma } from "@autoact/db";
import type {
  NodeAnalysisEntry,
  OptimizationSuggestion,
  NodeToCreate,
  WorkflowAnalysisResult,
} from "@autoact/types";

async function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });
}

export async function analyzeWorkflow(
  templateId: string,
  definition: any,
): Promise<WorkflowAnalysisResult | null> {
  const model = await getGeminiModel();
  if (!model) {
    console.warn("[node-analyzer] GEMINI_API_KEY not set, skipping analysis");
    return null;
  }

  // Load available native nodes
  const nativeNodes = await prisma.nativeNode.findMany({
    where: { status: "active" },
    select: { nodeId: true, name: true, replaces: true, category: true },
  });

  const nativeNodeList = nativeNodes.map((n) => ({
    node_id: n.nodeId,
    name: n.name,
    replaces: n.replaces,
    category: n.category,
  }));

  const nodes = definition.nodes || definition.steps || [];

  const prompt = `You are a workflow automation expert. Analyze this workflow JSON and identify external API dependencies.

For each node:
1. Identify if it calls an external paid/rate-limited API service (based on URLs, service names, auth_ref usage)
2. Check if any of the available native nodes can replace it (match by the "replaces" field)
3. If no native replacement exists but the node uses an external API, describe what a native implementation would look like
4. Identify workflow optimization opportunities (parallelization of independent nodes, missing error handling after HTTP calls, redundant requests that could be cached)

Workflow nodes:
${JSON.stringify(nodes, null, 2)}

Available native nodes (platform library):
${JSON.stringify(nativeNodeList, null, 2)}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "node_analysis": [
    {
      "node_id": "string - the node id from workflow",
      "node_type": "string - the node type",
      "external_service": "string or null - name of external API service if detected",
      "has_native_replacement": "boolean",
      "native_node_id": "string or null - matching native node id",
      "confidence": "number 0-1",
      "reason": "string - explanation"
    }
  ],
  "optimization_suggestions": [
    {
      "id": "string - unique id like opt_1",
      "type": "parallelization | error_handling | caching | merge_requests",
      "description": "string - what to optimize",
      "affected_nodes": ["node_id1", "node_id2"],
      "priority": "high | medium | low"
    }
  ],
  "nodes_to_create": [
    {
      "suggested_id": "string - snake_case id for new native node",
      "name": "string - display name",
      "replaces": ["string - external services it replaces"],
      "implementation_approach": "string - how to implement without external API",
      "packages": ["string - npm packages needed"],
      "input_schema": {},
      "output_schema": {}
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    const analysisResult: WorkflowAnalysisResult = {
      nodeAnalysis: (parsed.node_analysis || []).map((entry: any): NodeAnalysisEntry => ({
        nodeId: entry.node_id || entry.nodeId || "",
        nodeType: entry.node_type || entry.nodeType || "",
        externalService: entry.external_service ?? entry.externalService ?? null,
        hasNativeReplacement: Boolean(entry.has_native_replacement ?? entry.hasNativeReplacement),
        nativeNodeId: entry.native_node_id ?? entry.nativeNodeId ?? null,
        confidence: Number(entry.confidence) || 0,
        reason: entry.reason || "",
      })),
      optimizationSuggestions: (parsed.optimization_suggestions || []).map((s: any): OptimizationSuggestion => ({
        id: s.id || `opt_${Math.random().toString(36).slice(2, 8)}`,
        type: s.type || "error_handling",
        description: s.description || "",
        affectedNodes: s.affected_nodes || s.affectedNodes || [],
        priority: s.priority || "medium",
      })),
      nodesToCreate: (parsed.nodes_to_create || []).map((n: any): NodeToCreate => ({
        suggestedId: n.suggested_id || n.suggestedId || "",
        name: n.name || "",
        replaces: n.replaces || [],
        implementationApproach: n.implementation_approach || n.implementationApproach || "",
        packages: n.packages || [],
        inputSchema: n.input_schema || n.inputSchema || {},
        outputSchema: n.output_schema || n.outputSchema || {},
      })),
    };

    // Save report to DB
    await prisma.workflowAnalysisReport.create({
      data: {
        templateId,
        nodeAnalysis: analysisResult.nodeAnalysis as any,
        optimizationSuggestions: analysisResult.optimizationSuggestions as any,
        nodesToCreate: analysisResult.nodesToCreate as any,
        status: "pending",
      },
    });

    return analysisResult;
  } catch (err) {
    console.error("[node-analyzer] Analysis failed:", err);
    return null;
  }
}

export async function getLatestAnalysis(templateId: string) {
  return prisma.workflowAnalysisReport.findFirst({
    where: { templateId },
    orderBy: { createdAt: "desc" },
  });
}
