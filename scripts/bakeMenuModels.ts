import fs from 'node:fs';
import path from 'node:path';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildFantasyCastleGeometryGroup } from '../src/three/assets/castleBuilder';
import {
  buildCliffFormationsGeometryGroup,
  buildSanctuaryPedestalGeometryGroup,
} from '../src/three/assets/rockTerrainBuilder';

// Minimal Node FileReader polyfill for Three.js GLTFExporter binary (.glb) mode
if (typeof globalThis.FileReader === 'undefined') {
  class NodeFileReader {
    result: ArrayBuffer | string | null = null;
    onloadend: (() => void) | null = null;

    readAsArrayBuffer(blob: Blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onloadend?.();
      });
    }

    readAsDataURL(blob: Blob) {
      blob.arrayBuffer().then((buf) => {
        const b64 = Buffer.from(buf).toString('base64');
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${b64}`;
        this.onloadend?.();
      });
    }
  }
  (globalThis as unknown as { FileReader: typeof NodeFileReader }).FileReader = NodeFileReader;
}

async function bake() {
  const outDir = path.resolve(process.cwd(), 'public', 'models');
  fs.mkdirSync(outDir, { recursive: true });

  const exporter = new GLTFExporter();
  const targets = [
    { name: 'fantasy_castle.glb', build: buildFantasyCastleGeometryGroup },
    { name: 'cliff_outcrops.glb', build: buildCliffFormationsGeometryGroup },
    { name: 'sanctuary_pedestal.glb', build: buildSanctuaryPedestalGeometryGroup },
  ];

  for (const t of targets) {
    const group = t.build();
    const glb = (await exporter.parseAsync(group, { binary: true })) as ArrayBuffer;
    const outPath = path.join(outDir, t.name);
    fs.writeFileSync(outPath, Buffer.from(glb));
    console.log(`Baked ${t.name} (${(glb.byteLength / 1024).toFixed(1)} KB)`);
  }
}

bake().catch((err) => {
  console.error(err);
  process.exit(1);
});
