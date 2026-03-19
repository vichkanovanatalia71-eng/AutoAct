import { prisma } from "@autoact/db";
import type { NodeToCreate } from "@autoact/types";
import * as vm from "node:vm";

async function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });
}

export async function generateNativeNode(nodeToCreate: NodeToCreate) {
  const model = await getGeminiModel();
  if (!model) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const prompt = `Create a JavaScript async function for a workflow automation node.

Node: "${nodeToCreate.name}" — replaces external service(s): ${nodeToCreate.replaces.join(", ")}

Implementation approach: ${nodeToCreate.implementationApproach}

Input schema: ${JSON.stringify(nodeToCreate.inputSchema, null, 2)}
Output schema: ${JSON.stringify(nodeToCreate.outputSchema, null, 2)}
Suggested npm packages: ${nodeToCreate.packages.join(", ") || "none (use native Node.js APIs)"}

The function body will be wrapped as:
async function execute(input, config) { <YOUR_CODE_HERE> }

Requirements:
- Do NOT include the function declaration — only the body code
- Do NOT call external paid APIs — implement locally using Node.js built-in modules or the suggested packages
- Handle errors gracefully with try/catch
- Return data matching the output schema
- Use 'return' to return the result

Return ONLY valid JSON (no markdown, no explanation):
{
  "executor_code": "string - the function body code only",
  "test_cases": [
    {
      "input": {},
      "config": {},
      "expected_output": {}
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let jsonStr = responseText;
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);
  const executorCode = parsed.executor_code || "";
  const testCases = parsed.test_cases || [];

  const nativeNode = await prisma.nativeNode.create({
    data: {
      nodeId: nodeToCreate.suggestedId,
      name: nodeToCreate.name,
      category: "AI Generated",
      replaces: nodeToCreate.replaces,
      inputSchema: JSON.parse(JSON.stringify(nodeToCreate.inputSchema)),
      outputSchema: JSON.parse(JSON.stringify(nodeToCreate.outputSchema)),
      executorCode,
      testCases,
      status: "needs_review",
      isAiGenerated: true,
    },
  });

  return nativeNode;
}

export interface TestResult {
  passed: number;
  failed: number;
  total: number;
  errors: string[];
}

export async function testNativeNode(nodeId: string): Promise<TestResult> {
  const node = await prisma.nativeNode.findUnique({
    where: { nodeId },
  });

  if (!node) {
    throw new Error(`Native node "${nodeId}" not found`);
  }

  const testCases = (node.testCases as any[]) || [];
  if (testCases.length === 0) {
    return { passed: 0, failed: 0, total: 0, errors: ["No test cases defined"] };
  }

  const result: TestResult = { passed: 0, failed: 0, total: testCases.length, errors: [] };

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      // Create sandboxed execution context
      const sandbox = {
        input: tc.input || {},
        config: tc.config || {},
        result: undefined as unknown,
        Buffer,
        JSON,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        RegExp,
        Error,
        Promise,
        console: { log: () => {}, error: () => {}, warn: () => {} },
      };

      const code = `
        (async () => {
          const execute = async (input, config) => {
            ${node.executorCode}
          };
          result = await execute(input, config);
        })()
      `;

      const context = vm.createContext(sandbox);
      const script = new vm.Script(code);
      await script.runInContext(context, { timeout: 10000 });

      // Basic validation: check that result is not undefined
      if (sandbox.result !== undefined) {
        result.passed++;
      } else {
        result.failed++;
        result.errors.push(`Test case ${i + 1}: returned undefined`);
      }
    } catch (err) {
      result.failed++;
      result.errors.push(
        `Test case ${i + 1}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // If all tests passed, update status to active
  if (result.failed === 0 && result.passed > 0) {
    await prisma.nativeNode.update({
      where: { nodeId },
      data: { status: "active" },
    });
  }

  return result;
}
