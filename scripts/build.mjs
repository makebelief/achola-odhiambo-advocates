import fs from 'node:fs'; import path from 'node:path';
const src=path.resolve('site'), out=path.resolve('dist'); fs.rmSync(out,{recursive:true,force:true}); fs.cpSync(src,out,{recursive:true}); console.log('Built dist/');
