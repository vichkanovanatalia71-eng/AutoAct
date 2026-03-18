import type { WorkflowNode } from "@autoact/types";

export interface DiffResult {
  nodes: {
    added: WorkflowNode[];
    removed: string[];
    modified: string[];
  };
  credentials: {
    added: string[];
    removed: string[];
  };
  metadata: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
  };
  hasBreakingChanges: boolean;
}

interface WorkflowJson {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  required_credentials?: string[];
  nodes?: WorkflowNode[];
  trigger?: { type: string; config?: Record<string, unknown> };
}

export function diffWorkflowJson(
  oldJson: WorkflowJson,
  newJson: WorkflowJson
): DiffResult {
  const oldNodes = oldJson.nodes ?? [];
  const newNodes = newJson.nodes ?? [];
  const oldCreds = new Set(oldJson.required_credentials ?? []);
  const newCreds = new Set(newJson.required_credentials ?? []);

  // Node diff by id
  const oldNodeMap = new Map(oldNodes.map((n) => [n.id, n]));
  const newNodeMap = new Map(newNodes.map((n) => [n.id, n]));

  const addedNodes: WorkflowNode[] = [];
  const removedNodeIds: string[] = [];
  const modifiedNodeIds: string[] = [];

  for (const [id, node] of newNodeMap) {
    if (!oldNodeMap.has(id)) {
      addedNodes.push(node);
    } else {
      const oldNode = oldNodeMap.get(id)!;
      if (JSON.stringify(oldNode) !== JSON.stringify(node)) {
        modifiedNodeIds.push(id);
      }
    }
  }

  for (const id of oldNodeMap.keys()) {
    if (!newNodeMap.has(id)) {
      removedNodeIds.push(id);
    }
  }

  // Credentials diff
  const addedCreds = [...newCreds].filter((c) => !oldCreds.has(c));
  const removedCreds = [...oldCreds].filter((c) => !newCreds.has(c));

  // Metadata changes
  const metadata: DiffResult["metadata"] = {};
  if (newJson.name && newJson.name !== oldJson.name) metadata.name = newJson.name;
  if (newJson.description && newJson.description !== oldJson.description)
    metadata.description = newJson.description;
  if (newJson.category && newJson.category !== oldJson.category)
    metadata.category = newJson.category;
  if (
    newJson.tags &&
    JSON.stringify(newJson.tags) !== JSON.stringify(oldJson.tags)
  )
    metadata.tags = newJson.tags;

  return {
    nodes: {
      added: addedNodes,
      removed: removedNodeIds,
      modified: modifiedNodeIds,
    },
    credentials: {
      added: addedCreds,
      removed: removedCreds,
    },
    metadata,
    hasBreakingChanges: addedCreds.length > 0,
  };
}
