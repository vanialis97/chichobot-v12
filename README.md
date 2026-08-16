# ChichoBot Gemini V1.2

Aplicación web para consultar los manuales técnicos de Infraestructura mediante Gemini, con respuesta sustentada y enlace directo a la página del PDF.

## Qué cambia en V1.2

- Mantiene la interfaz corporativa de ChichoBot.
- No muestra pantallazos en la respuesta: muestra botones **Abrir página ↗**.
- Búsqueda mejorada para consultas coloquiales como “¿cuánto mide el zócalo?”.
- Conserva contexto conversacional para preguntas como “¿y en Express?”.
- Para flujos, diagramas, tablas, cronogramas y gráficos, extrae las páginas candidatas del PDF y las envía a Gemini como **PDF visual**, para que el modelo interprete también flechas, cajas, secuencias, cotas y relaciones gráficas.
- Gemini recibe únicamente páginas recuperadas de los manuales y el texto correspondiente; el prompt le prohíbe completar con conocimiento externo.
- La API key queda únicamente en Vercel como variable de entorno.

## Manuales incluidos

- `public/manuals/manual-universal.pdf` — Manual IBK Universal 2025 — 241 páginas
- `public/manuals/manual-express.pdf` — Manual IBK Express 2025 — 87 páginas
- `public/manuals/manual-obra.pdf` — Manual de obra — 191 páginas

El índice local contiene 519 páginas en `data/manual-index.json`.

## Antes de subir a Vercel

Puedes reutilizar una API key de Gemini que ya hayas usado si sigue activa y tiene acceso/cuota para el modelo configurado. No copies la key dentro de ningún archivo del proyecto.

La variable que usa ChichoBot es:

```text
GEMINI_API_KEY
```

El modelo se puede cambiar sin tocar código usando:

```text
GEMINI_MODEL=gemini-3.6-flash
```

## Publicarlo con GitHub + Vercel

1. Descomprime esta carpeta.
2. Crea un repositorio nuevo en GitHub, por ejemplo `chichobot-v12`.
3. Sube **todo el contenido** de la carpeta `chichobot-v1` al repositorio. No subas ningún archivo `.env` con claves reales.
4. En Vercel pulsa **Add New > Project** e importa el repositorio.
5. Vercel detectará Next.js automáticamente.
6. Antes de desplegar, agrega en **Environment Variables**:
   - Nombre: `GEMINI_API_KEY`
   - Valor: tu API key de Google AI Studio
7. Agrega opcionalmente:
   - Nombre: `GEMINI_MODEL`
   - Valor: `gemini-3.6-flash`
8. Pulsa **Deploy**.
9. Cuando termine tendrás un link similar a `https://chichobot-v12.vercel.app`.

## Pruebas recomendadas

Prueba primero estas preguntas:

- `¿Cuánto mide el zócalo?`
- `¿Y en Express?`
- `Muéstrame el flujo de un Express`
- `¿Qué sigue después del kick-off?`
- `¿Cuáles son los hitos de obra?`
- `¿Qué pintura se usa en backoffice?`

Verifica que la respuesta coincida con el manual y que **Abrir página ↗** abra la página correcta del PDF.

## Importante sobre uso público

El enlace de Vercel puede ser público, pero cada consulta consume la cuota de tu proyecto de Gemini. Para una prueba de equipo pequeño está bien. Antes de abrirlo ampliamente conviene agregar login/rate limiting y validar el tratamiento permitido de documentación corporativa.

## Desarrollo local opcional

```bash
npm install
npm run dev
```

Crea un archivo `.env.local` (solo en tu computadora) con:

```text
GEMINI_API_KEY=TU_KEY
GEMINI_MODEL=gemini-3.6-flash
```

Luego abre `http://localhost:3000`.
