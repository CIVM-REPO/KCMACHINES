import { readFile } from "node:fs/promises";
import { inflateRawSync, inflateSync } from "node:zlib";

const filePath = "C:/Users/DESARROLLO/Downloads/Libro 1.pdf";
const bytes = await readFile(filePath);
const latin = bytes.toString("latin1");
const streams = [...latin.matchAll(/<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g)];
const chunks = [];

for (const match of streams) {
  let data = Buffer.from(match[2], "latin1");

  if (/FlateDecode/.test(match[1])) {
    try {
      data = inflateSync(data);
    } catch {
      try {
        data = inflateRawSync(data);
      } catch {
        continue;
      }
    }
  }

  const text = data.toString("utf8");
  if (/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(text)) {
    chunks.push(text);
  }
}

console.log(chunks.join("\n---STREAM---\n").slice(0, 40000));
