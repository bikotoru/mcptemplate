import express from 'express';
import cors from 'cors';
import { getToolSchemas, executeTool } from './tools/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint para listar herramientas disponibles
app.get('/tools', async (req, res) => {
  try {
    const schemas = getToolSchemas();
    res.json({
      success: true,
      tools: schemas
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para ejecutar herramientas
app.post('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const args = req.body;
    
    console.log(`Ejecutando tool: ${toolName}`, { args });
    
    const result = await executeTool(toolName, args);
    
    res.json({
      success: true,
      result: result
    });
  } catch (error: any) {
    console.error(`Error ejecutando tool ${req.params.toolName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'MCP Server funcionando correctamente',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 MCP Server ejecutándose en http://localhost:${PORT}`);
  console.log(`📋 Ver herramientas disponibles: http://localhost:${PORT}/tools`);
  console.log(`❤️ Estado del servidor: http://localhost:${PORT}/health`);
});

export default app;