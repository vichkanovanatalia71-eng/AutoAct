import { prisma } from "@autoact/db";
import type { NodeAnalysisEntry, OptimizationSuggestion } from "@autoact/types";

export async function applyNodeReplacements(
  templateId: string,
  nodeIds: string[],
  reportId: string,
) {
  const template = await prisma.workflowTemplate.findUniqueOrThrow({
    where: { id: templateId },
  });

  const report = await prisma.workflowAnalysisReport.findUniqueOrThrow({
    where: { id: reportId },
  });

  const nodeAnalysis = report.nodeAnalysis as unknown as NodeAnalysisEntry[];
  const definition = template.definition as any;
  const nodes: any[] = definition.nodes || [];

  // Build set of nodes to replace
  const toReplace = new Map<string, NodeAnalysisEntry>();
  for (const entry of nodeAnalysis) {
    if (nodeIds.includes(entry.nodeId) && entry.hasNativeReplacement && entry.nativeNodeId) {
      toReplace.set(entry.nodeId, entry);
    }
  }

  if (toReplace.size === 0) {
    return template;
  }

  // Track which credentials are no longer needed
  const removedAuthRefs = new Set<string>();

  // Patch nodes
  const patchedNodes = nodes.map((node: any) => {
    const replacement = toReplace.get(node.id);
    if (!replacement || !replacement.nativeNodeId) return node;

    // Track auth_ref being removed
    if (node.config?.auth_ref) {
      removedAuthRefs.add(node.config.auth_ref);
    }

    return {
      ...node,
      type: "native",
      config: {
        ...node.config,
        native_node_id: replacement.nativeNodeId,
        _original_type: node.type,
        auth_ref: undefined,
      },
    };
  });

  // Update requiredCredentials: remove credentials that were only used by replaced nodes
  const stillUsedAuthRefs = new Set<string>();
  for (const node of patchedNodes) {
    if (node.config?.auth_ref) {
      stillUsedAuthRefs.add(node.config.auth_ref);
    }
  }
  const updatedCredentials = (template.requiredCredentials || []).filter(
    (cred: string) => !removedAuthRefs.has(cred) || stillUsedAuthRefs.has(cred),
  );

  const updatedDefinition = {
    ...definition,
    nodes: patchedNodes,
    required_credentials: updatedCredentials,
  };

  const updated = await prisma.workflowTemplate.update({
    where: { id: templateId },
    data: {
      definition: updatedDefinition,
      requiredCredentials: updatedCredentials,
      version: template.version + 1,
    },
  });

  return updated;
}

export async function applyOptimizations(
  templateId: string,
  optimizationIds: string[],
  reportId: string,
) {
  const template = await prisma.workflowTemplate.findUniqueOrThrow({
    where: { id: templateId },
  });

  const report = await prisma.workflowAnalysisReport.findUniqueOrThrow({
    where: { id: reportId },
  });

  const suggestions = report.optimizationSuggestions as unknown as OptimizationSuggestion[];
  const definition = template.definition as any;
  const nodes: any[] = [...(definition.nodes || [])];

  const toApply = suggestions.filter((s) => optimizationIds.includes(s.id));

  for (const suggestion of toApply) {
    if (suggestion.type === "error_handling") {
      // Insert a condition node after each affected HTTP node to check response status
      const newNodes: any[] = [];
      for (const node of nodes) {
        newNodes.push(node);

        if (
          suggestion.affectedNodes.includes(node.id) &&
          node.type === "http_request"
        ) {
          const errorHandlerId = `${node.id}_error_check`;
          const errorHandler = {
            id: errorHandlerId,
            type: "condition",
            config: {
              field: `{{${node.id}.status}}`,
              operator: ">=",
              value: 400,
            },
            next_true: [], // error path — stop
            next_false: node.next || [],
          };

          // Redirect the original node to the error handler
          node.next = [errorHandlerId];
          newNodes.push(errorHandler);
        }
      }
      nodes.length = 0;
      nodes.push(...newNodes);
    }

    if (suggestion.type === "parallelization") {
      // Find parent node that has sequential next pointing to both affected nodes
      // and make them parallel (both in parent's next array)
      const affectedSet = new Set(suggestion.affectedNodes);
      for (const node of nodes) {
        if (!node.next || node.next.length !== 1) continue;
        const nextId = node.next[0];
        if (!affectedSet.has(nextId)) continue;

        // Check if the next node also points to another affected node
        const nextNode = nodes.find((n: any) => n.id === nextId);
        if (nextNode?.next?.length === 1 && affectedSet.has(nextNode.next[0])) {
          // Make both run in parallel from parent
          node.next = [nextId, nextNode.next[0]];
          nextNode.next = [];
        }
      }
    }
  }

  const updatedDefinition = { ...definition, nodes };

  const updated = await prisma.workflowTemplate.update({
    where: { id: templateId },
    data: {
      definition: updatedDefinition,
      version: template.version + 1,
    },
  });

  return updated;
}

export async function updateReportStatus(
  reportId: string,
  appliedNodeIds: string[],
  appliedOptIds: string[],
) {
  const report = await prisma.workflowAnalysisReport.findUniqueOrThrow({
    where: { id: reportId },
  });

  const nodeAnalysis = report.nodeAnalysis as unknown as NodeAnalysisEntry[];
  const suggestions = report.optimizationSuggestions as unknown as OptimizationSuggestion[];

  const totalReplaceable = nodeAnalysis.filter((n) => n.hasNativeReplacement).length;
  const totalOptimizations = suggestions.length;
  const totalActions = totalReplaceable + totalOptimizations;
  const appliedActions = appliedNodeIds.length + appliedOptIds.length;

  let status: string;
  if (appliedActions === 0) {
    status = "rejected";
  } else if (appliedActions >= totalActions) {
    status = "applied";
  } else {
    status = "partially_applied";
  }

  return prisma.workflowAnalysisReport.update({
    where: { id: reportId },
    data: {
      status,
      appliedAt: appliedActions > 0 ? new Date() : undefined,
    },
  });
}
