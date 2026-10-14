// Dump every texture of a GLB as PNG: node models/textures.mjs in.glb out/prefix
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
doc.getRoot().listTextures().forEach((t,i)=>fs.writeFileSync(process.argv[3]+'_'+i+'.png', t.getImage()));
