# Arquitectura ChichoBot V1.2

## Flujo de una consulta

1. El usuario pregunta desde la interfaz web.
2. `/api/chat` normaliza la pregunta y recupera páginas candidatas del índice local.
3. El buscador usa coincidencia textual, sinónimos técnicos, intención de medida y contexto conversacional.
4. Para cada consulta se construye un PDF temporal de evidencia con las páginas candidatas reales de los manuales. En consultas de flujo/proceso se incluyen también páginas contiguas para preservar contexto gráfico.
5. Gemini recibe:
   - la pregunta;
   - contexto conversacional limitado;
   - texto extraído de las páginas recuperadas;
   - el PDF visual de evidencia;
   - un mapa que relaciona cada página temporal con la página original del manual.
6. El prompt obliga a responder únicamente con esa evidencia.
7. La interfaz muestra respuesta, nivel de confianza y enlaces directos a las páginas originales de los PDFs.

## Por qué la V1.2 entiende mejor gráficos

La V1.1 dependía principalmente del texto extraído del PDF. En diagramas complejos, el orden de lectura del OCR puede no coincidir con flechas, columnas o bloques visuales. La V1.2 usa el PDF real como entrada multimodal para las páginas relevantes, de modo que Gemini puede analizar la disposición visual además del texto.

## Seguridad

La API key nunca llega al navegador. Solo se lee desde `process.env.GEMINI_API_KEY` en la ruta de servidor de Next.js.
