import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

const preferredPort = Number(process.env.PORT || 4173);

const server = createServer(async (request, response) => {
  const requestedPath = request.url === "/" ? "/index.html" : request.url;
  const cleanPath = normalize(decodeURIComponent(requestedPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, cleanPath);

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": types[extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store, max-age=0"
    });
    response.end(body);
  } catch {
    response.writeHead(404, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, max-age=0"
    });
    response.end("No encontrado");
  }
});

function listen(port) {
  server.listen(port, "0.0.0.0", () => {
    console.log(`KC Machines prototype: http://127.0.0.1:${port}`);
  });
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && preferredPort === 4173) {
    listen(4174);
    return;
  }
  throw error;
});

listen(preferredPort);
