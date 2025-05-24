#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

// URL del servidor HTTP
const SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';

class MCPWrapper {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-creator-http-wrapper',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Handler para listar herramientas
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/tools`);
        
        if (response.data.success) {
          return {
            tools: response.data.tools,
          };
        } else {
          throw new Error('Failed to fetch tools from HTTP server');
        }
      } catch (error: any) {
        console.error('Error fetching tools:', error.message);
        return {
          tools: [],
        };
      }
    });

    // Handler para ejecutar herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        console.error(`DEBUG: Wrapper ejecutando tool: ${name}`);
        
        const response = await axios.post(`${SERVER_URL}/tools/${name}`, args);
        
        if (response.data.success) {
          return response.data.result;
        } else {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${response.data.error}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error: any) {
        console.error(`Error executing tool ${request.params.name}:`, error.message);
        
        return {
          content: [
            {
              type: "text" as const,
              text: `Error connecting to HTTP server: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`MCP Wrapper conectado al servidor HTTP: ${SERVER_URL}`);
  }
}

const wrapper = new MCPWrapper();
wrapper.run().catch(console.error);