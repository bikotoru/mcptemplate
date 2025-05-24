import { apiClient } from "../utils/apiClient.js";
import { ResponseFormatter } from "../utils/responseFormatter.js";
import { ToolResponse } from "../types/index.js";

export class ValidateConfigTool {
  static getSchema() {
    return {
      name: "validate_config",
      description: "Valida una configuración CRUD sin generar archivos",
      inputSchema: {
        type: "object",
        properties: {
          config: {
            type: "object",
            description: "Configuración a validar"
          }
        },
        required: ["config"]
      }
    };
  }

  static async execute(args: any): Promise<ToolResponse> {
    try {
      if (!args || !args.config) {
        throw new Error("No se proporcionó configuración para validar");
      }

      const response = await apiClient.post('/validate', {
        config: args.config
      });

      return ResponseFormatter.formatValidationResult(response.data, args.config);
    } catch (error: any) {
      return ResponseFormatter.formatError(`Error validando configuración: ${error.response?.data?.detail || error.message}`);
    }
  }
}