"""
Punto de entrada para ejecutar el servidor MCP como módulo
"""

import asyncio
import sys
from pathlib import Path

# Agregar el directorio padre al path para importaciones
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from python.server import main

if __name__ == "__main__":
    asyncio.run(main())