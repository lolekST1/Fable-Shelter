// Drop TANGENT attributes (no normal maps in use, saves size).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const t = p.getAttribute('TANGENT'); if (t) { p.setAttribute('TANGENT', null); t.dispose(); } }
await io.write(process.argv[3], doc);
