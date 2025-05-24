#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getToolSchemas, executeTool } from "./tools/index.js";

const server = new Server(
  {
    name: "mcp-creator-bridge",
    version: "1.0.0",
  }
);

// Handler para listar herramientas disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getToolSchemas(),
  };
});

// Handler para ejecutar herramientas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await executeTool(name, args);
    return {
      content: result.content,
      isError: result.isError,
    };
  } catch (error: any) {
    // Note: No usar console.log en MCP - interfiere con la comunicación JSON
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    return {
      content: [
        {
          type: "text" as const,
          text: `Error ejecutando herramienta ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});