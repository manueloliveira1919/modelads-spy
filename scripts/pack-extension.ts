// Regenerates public/modelads-extension.zip from extension/ (no external tools).
// Usage: bun scripts/pack-extension.ts
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";

const SRC = join(import.meta.dir, "..", "extension");
const OUT = join(import.meta.dir, "..", "public", "modelads-extension.zip");

const table = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (const x of b) c = table[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const files = readdirSync(SRC).filter((f) => statSync(join(SRC, f)).isFile()).sort();
const locals: Buffer[] = [];
const centrals: Buffer[] = [];
let offset = 0;
const d = new Date();
const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();

for (const name of files) {
  const data = readFileSync(join(SRC, name));
  const comp = deflateRawSync(data);
  const crc = crc32(data);
  const nameBuf = Buffer.from(name);
  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6);
  lh.writeUInt16LE(8, 8); lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12);
  lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22);
  lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
  ch.writeUInt16LE(0, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14);
  ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24);
  ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt32LE(offset, 42);
  locals.push(lh, nameBuf, comp);
  centrals.push(ch, nameBuf);
  offset += lh.length + nameBuf.length + comp.length;
}
const central = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
writeFileSync(OUT, Buffer.concat([...locals, central, end]));
const version = JSON.parse(readFileSync(join(SRC, "manifest.json"), "utf8")).version;
console.log(`Packed ${files.length} files (v${version}) -> public/modelads-extension.zip`);
