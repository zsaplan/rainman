import { Type, type Static } from "@sinclair/typebox";
import type {
  AgentSession as PiAgentSession,
  ModelRegistry,
  ToolDefinition,
  AuthStorage,
} from "@mariozechner/pi-coding-agent";
import type { QueryResponse } from "../types/api";
import type { AppConfig } from "../config/env";
import type { SubmitResultInput } from "../types/tools";
import { getModelConfig } from "./modelConfig";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { loadPiSdk } from "./loadPiSdk";
import { readTool } from "../tools/readTool";
import { findTool } from "../tools/findTool";
import { grepTool } from "../tools/grepTool";
import { submitResultTool } from "../tools/submitResultTool";
import { getKbVersion } from "../kb/kbVersion";
import { MAX_RESULT_REPAIR_ATTEMPTS } from "./retryPolicy";

const citationSchema = Type.Object({
  path: Type.String(),
  file: Type.String(),
  startLine: Type.Integer({ minimum: 1 }),
  endLine: Type.Integer({ minimum: 1 }),
  quote: Type.String(),
});

const submitResultSchema = Type.Object({
  status: Type.Union([
    Type.Literal("answered"),
    Type.Literal("insufficient_evidence"),
    Type.Literal("conflict"),
  ]),
  data: Type.Record(Type.String(), Type.Any()),
  citations: Type.Array(citationSchema),
  missingInformation: Type.Array(Type.String()),
  warnings: Type.Array(Type.String()),
  meta: Type.Optional(
    Type.Object({
      requestId: Type.String(),
      model: Type.String(),
      kbVersion: Type.String(),
    }),
  ),
});

const readParameters = Type.Object({
  filePath: Type.String(),
  offset: Type.Optional(Type.Integer({ minimum: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
});

const findParameters = Type.Object({
  query: Type.String(),
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
});

const grepParameters = Type.Object({
  pattern: Type.String(),
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
});

type SubmitResultArgs = Static<typeof submitResultSchema>;

export interface AgentSession {
  requestId: string;
  prompt: string;
  model: string;
  provider: string;
  session: PiAgentSession;
  getSubmittedResult(): QueryResponse | undefined;
  dispose(): void;
}

function formatReadResult(result: ReturnType<typeof readTool>) {
  const linesSection = result.content || "(no content in requested range)";
  return [
    `file: ${result.filePath}`,
    `startLine: ${result.startLine}`,
    `endLine: ${result.endLine}`,
    `totalLines: ${result.totalLines}`,
    "content:",
    linesSection,
  ].join("\n");
}

function formatFindResult(matches: string[]) {
  if (matches.length === 0) {
    return "No matches found.";
  }

  return matches.map((match, index) => `${index + 1}. ${match}`).join("\n");
}

function formatGrepResult(matches: ReturnType<typeof grepTool>) {
  if (matches.length === 0) {
    return "No matches found.";
  }

  return matches.map((match) => `${match.file}:${match.lineNumber} | ${match.line}`).join("\n");
}

async function createResourceLoader(pi: Awaited<ReturnType<typeof loadPiSdk>>) {
  const loader = new pi.DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir: "/tmp/rainman-agent",
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    agentsFilesOverride: () => ({ agentsFiles: [] }),
    systemPromptOverride: () => SYSTEM_PROMPT,
    appendSystemPromptOverride: () => [],
  });

  await loader.reload();
  return loader;
}

function toToolErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const details = "details" in error ? (error as { details?: unknown }).details : undefined;
    const code = "code" in error ? (error as { code?: unknown }).code : undefined;
    return JSON.stringify({
      code: typeof code === "string" ? code : "TOOL_ERROR",
      message: error.message,
      details,
    });
  }

  return JSON.stringify({
    code: "TOOL_ERROR",
    message: String(error),
  });
}

function resolveModel(modelRegistry: ModelRegistry, configuredModel: string) {
  const normalizedModelId = configuredModel.startsWith("openrouter/")
    ? configuredModel.slice("openrouter/".length)
    : configuredModel;

  const exact = modelRegistry.find("openrouter", normalizedModelId);
  if (exact) {
    return exact;
  }

  const fallback = modelRegistry
    .getAvailable()
    .find((model) => model.provider === "openrouter" && (model.id === normalizedModelId || `openrouter/${model.id}` === configuredModel));

  if (fallback) {
    return fallback;
  }

  const suggestions = modelRegistry
    .getAvailable()
    .filter((model) => model.provider === "openrouter")
    .slice(0, 10)
    .map((model) => `openrouter/${model.id}`);

  throw new Error(
    `Configured model was not found in Pi model registry: ${configuredModel}. Sample available OpenRouter models: ${suggestions.join(", ")}`,
  );
}

function createCustomTools(
  config: AppConfig,
  requestId: string,
  modelName: string,
  submittedResult: { value?: QueryResponse },
): ToolDefinition[] {
  return [
    {
      name: "read",
      label: "Read",
      description: "Read a markdown file under the KB root and return stable line-numbered content.",
      promptSnippet: "read(filePath, offset?, limit?) - read markdown evidence with stable line numbers",
      promptGuidelines: [
        "Use read to gather evidence.",
        "Only read output counts as evidence.",
        "Citations must quote exact lines from markdown files returned by read.",
      ],
      parameters: readParameters,
      execute: async (_toolCallId, params: Static<typeof readParameters>) => {
        try {
          const result = readTool(config.KB_ROOT, params);
          return {
            content: [{ type: "text", text: formatReadResult(result) }],
            details: result,
          };
        } catch (error) {
          throw new Error(toToolErrorMessage(error));
        }
      },
    },
    {
      name: "find",
      label: "Find",
      description: "Find markdown files under the KB root by filename or path fragment. Navigation only, not evidence.",
      promptSnippet: "find(query, limit?) - locate markdown files inside the KB root",
      promptGuidelines: ["Find results are navigation aids only and are never evidence."],
      parameters: findParameters,
      execute: async (_toolCallId, params: Static<typeof findParameters>) => {
        try {
          const result = findTool(config.KB_ROOT, params);
          return {
            content: [{ type: "text", text: formatFindResult(result) }],
            details: result,
          };
        } catch (error) {
          throw new Error(toToolErrorMessage(error));
        }
      },
    },
    {
      name: "grep",
      label: "Grep",
      description: "Search markdown files under the KB root for matching text. Navigation only, not evidence.",
      promptSnippet: "grep(pattern, limit?) - search markdown files for candidate evidence",
      promptGuidelines: ["Grep results are navigation aids only and are never evidence."],
      parameters: grepParameters,
      execute: async (_toolCallId, params: Static<typeof grepParameters>) => {
        try {
          const result = grepTool(config.KB_ROOT, params);
          return {
            content: [{ type: "text", text: formatGrepResult(result) }],
            details: result,
          };
        } catch (error) {
          throw new Error(toToolErrorMessage(error));
        }
      },
    },
    {
      name: "submit_result",
      label: "Submit Result",
      description:
        "Submit the final structured response. This is the only valid completion path. Every populated field in data must have citations.",
      promptSnippet:
        "submit_result(status, data, citations, missingInformation, warnings, meta?) - finalize only when every populated data field is fully supported",
      promptGuidelines: [
        "Call submit_result exactly once when the final payload is ready.",
        "If submit_result returns an error, repair the payload and try again.",
        "After submit_result succeeds, stop immediately.",
      ],
      parameters: submitResultSchema,
      execute: async (_toolCallId, params: SubmitResultArgs) => {
        try {
          const validated = submitResultTool(params as SubmitResultInput, {
            kbRoot: config.KB_ROOT,
            requestId,
            model: modelName,
            kbVersion: getKbVersion(config.KB_ROOT),
          });

          submittedResult.value = validated.result;
          return {
            content: [{ type: "text", text: "submit_result accepted. Stop now." }],
            details: validated.result,
          };
        } catch (error) {
          throw new Error(toToolErrorMessage(error));
        }
      },
    },
  ];
}

function createAuthStorage(pi: Awaited<ReturnType<typeof loadPiSdk>>, config: AppConfig): AuthStorage {
  const authStorage = pi.AuthStorage.inMemory();
  authStorage.setRuntimeApiKey("openrouter", config.OPENROUTER_API_KEY);
  return authStorage;
}

export async function createSession(requestId: string, config: AppConfig): Promise<AgentSession> {
  const pi = await loadPiSdk();
  const modelConfig = getModelConfig(config);
  const authStorage = createAuthStorage(pi, config);
  const modelRegistry = pi.ModelRegistry.inMemory(authStorage);
  const model = resolveModel(modelRegistry, modelConfig.model);
  const modelName = `${model.provider}/${model.id}`;
  const submittedResult: { value?: QueryResponse } = {};

  const resourceLoader = await createResourceLoader(pi);

  const { session } = await pi.createAgentSession({
    cwd: process.cwd(),
    agentDir: "/tmp/rainman-agent",
    model,
    thinkingLevel: "low",
    authStorage,
    modelRegistry,
    tools: [],
    customTools: createCustomTools(config, requestId, modelName, submittedResult),
    resourceLoader,
    sessionManager: pi.SessionManager.inMemory(),
    settingsManager: pi.SettingsManager.inMemory({
      compaction: { enabled: false },
      retry: { enabled: true, maxRetries: MAX_RESULT_REPAIR_ATTEMPTS },
    }),
  });

  return {
    requestId,
    prompt: SYSTEM_PROMPT,
    model: modelName,
    provider: model.provider,
    session,
    getSubmittedResult: () => submittedResult.value,
    dispose: () => session.dispose(),
  };
}
