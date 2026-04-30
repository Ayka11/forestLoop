import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");

const server = `import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 8080;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function getFilePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath = decodedPath === "/" ? "/index.html" : decodedPath;
  const requestedPath = path.normalize(relativePath).replace(/^([/\\\\])+/, "");
  const filePath = path.join(__dirname, requestedPath);

  return filePath.startsWith(__dirname) ? filePath : path.join(__dirname, "index.html");
}

async function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const fileStat = await stat(filePath);

  response.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Content-Length": fileStat.size,
    "Cache-Control": filePath.includes(\`\${path.sep}assets\${path.sep}\`)
      ? "public, max-age=31536000, immutable"
      : "no-cache"
  });

  createReadStream(filePath).pipe(response);
}

createServer(async (request, response) => {
  try {
    await sendFile(response, getFilePath(request.url || "/"));
  } catch {
    try {
      await sendFile(response, path.join(__dirname, "index.html"));
    } catch {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Application files were not found.");
    }
  }
}).listen(port, () => {
  console.log(\`Forest Loop Odyssey listening on port \${port}\`);
});
`;

const packageJson = {
  name: "forest-loop-odyssey-web",
  version: "1.0.0",
  private: true,
  type: "module",
  scripts: {
    start: "node server.js"
  },
  engines: {
    node: ">=18"
  }
};

await mkdir(distDir, { recursive: true });
await writeFile(path.join(distDir, "server.js"), server);
await writeFile(path.join(distDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
