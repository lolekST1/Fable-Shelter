// Remove the occlusion (AO) map. Pixal3D bakes a broken one that shows as black patches.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
for (const m of doc.getRoot().listMaterials()) m.setOcclusionTexture(null);
await io.write(process.argv[3], doc);
