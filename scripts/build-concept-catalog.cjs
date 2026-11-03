// Build the server's trusted catalog from the same reviewed content as the app.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const previous=require.extensions['.ts'];
require.extensions['.ts']=(module,file)=>{
 if(!file.startsWith(path.join(root,'src','lib','conceptLab')))throw new Error('Only concept content can be loaded');
 const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 module._compile(output,file);
};
try{const {sampleBook}=require('../src/lib/conceptLabContent.ts');
 const target=path.join(root,'supabase/functions/concept-lab/catalog.json');fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,JSON.stringify(sampleBook,null,2)+'\n');console.log(JSON.stringify({book:sampleBook.id,cards:sampleBook.cards.length,variants:sampleBook.variants.length,units:sampleBook.units.length}));
}finally{if(previous)require.extensions['.ts']=previous;else delete require.extensions['.ts'];}
