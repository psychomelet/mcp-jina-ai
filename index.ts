#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  Reader,
  ReaderResponse,
  Search,
  SearchResponse,
  Grounding,
  GroundingResponse,
  SearchCase,
  SearchCaseResponse,
  ReaderResponseSchema,
  SearchResponseSchema,
  GroundingResponseSchema,
  SearchCaseResponseSchema,
  ReaderSchema,
  SearchSchema,
  GroundingSchema,
  SearchCaseSchema,
} from "./schemas.js";

// Ensure the Jina API key is provided
const JINA_API_KEY = process.env.JINA_API_KEY;
if (!JINA_API_KEY) {
  console.error(
    "JINA_API_KEY environment variable is not set. You can get a key at https://jina.ai/"
  );
  process.exit(1);
}

// API endpoints as constants
const JINA_READ_ENDPOINT = "https://r.jina.ai/";
const JINA_SEARCH_ENDPOINT = "https://s.jina.ai/";
const JINA_GROUND_ENDPOINT = "https://g.jina.ai/";

// Initialize the MCP server
const server = new Server(
  { name: "jina-mcp-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

/**
 * Helper to create common headers and merge with additional ones.
 */
function createHeaders(additional: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${JINA_API_KEY}`,
    Accept: "application/json",
    "X-Locale": "en-US",
    ...additional,
  };
}

async function readWebPage(
  params: Reader
): Promise<ReaderResponse> {
  const headers = createHeaders({
    "Content-Type": "application/json",
    "X-Retain-Images": "none",
    "X-Return-Format": "markdown",
    "X-No-Cache": "true",
  });

  const response = await fetch(JINA_READ_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ url: params.url }),
  });

  if (!response.ok) {
    throw new Error(`Jina AI API error: ${response.statusText}`);
  }

  const json = await response.json();
  return ReaderResponseSchema.parse(json);
}

async function searchWeb(
  params: Search
): Promise<SearchResponse> {
  const headers = createHeaders({
    "X-Retain-Images": "none",
    "X-Return-Format": "markdown",
  });

  const queryString = encodeURIComponent(params.query);
  const url = `${JINA_SEARCH_ENDPOINT}${queryString}?count=${params.count}`;

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Jina AI Search API error: ${response.statusText}`);
  }

  const json = await response.json();
  return SearchResponseSchema.parse(json);
}

async function groundStatement(
  params: Grounding
): Promise<GroundingResponse> {
  const headers = createHeaders();

  const statementQuery = encodeURIComponent(params.statement);
  const url = `${JINA_GROUND_ENDPOINT}${statementQuery}${
    params.deepdive ? "?deepdive=true" : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Jina AI Grounding API error: ${response.statusText}`);
  }

  const json = await response.json();
  return GroundingResponseSchema.parse(json);
}

async function searchCase(
  params: SearchCase
): Promise<SearchCaseResponse> {
  const headers = createHeaders({
    "X-Retain-Images": "none",
    "X-Return-Format": "markdown",
    "X-Site": "https://casetext.com/"
  });

  const queryString = encodeURIComponent(params.query);
  const url = `${JINA_SEARCH_ENDPOINT}${queryString}?count=1`;

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Jina AI Search API error: ${response.statusText}`);
  }

  const json = await response.json();
  return SearchCaseResponseSchema.parse(json);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_webpage",
        description:
          "Extract content from a webpage (url) in a format optimized for LLMs",
        inputSchema: zodToJsonSchema(ReaderSchema),
      },
      {
        name: "search_web",
        description: "Search the web for information",
        inputSchema: zodToJsonSchema(SearchSchema),
      },
      {
        name: "fact_check",
        description: "Fact-check a statement using web search",
        inputSchema: zodToJsonSchema(GroundingSchema),
      },
      {
        name: "search_case",
        description: "Search for a legal case using web search",
        inputSchema: zodToJsonSchema(SearchCaseSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "read_webpage": {
        const args = ReaderSchema.parse(request.params.arguments);
        const result = await readWebPage(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "search_web": {
        const args = SearchSchema.parse(request.params.arguments);
        const result = await searchWeb(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "fact_check": {
        const args = GroundingSchema.parse(request.params.arguments);
        const result = await groundStatement(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "search_case": {
        const args = SearchCaseSchema.parse(request.params.arguments);
        const result = await searchCase(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid arguments: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
      );
    }
    throw error;
  }
});

async function runServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jina AI MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});