function readPreviewPort(value){
 if(value===undefined)return 8082;
 if(!/^[1-9]\d{0,4}$/.test(String(value))||Number(value)>65535)throw Error('PREVIEW_PORT must be an integer from 1 to 65535 (default: 8082).');
 return Number(value);
}
function previewUrl(path='/',port=readPreviewPort(process.env.PREVIEW_PORT)){
 const origin=new URL(`http://localhost:${readPreviewPort(port)}`).origin;
 if(typeof path!=='string'||!path.startsWith('/'))throw Error('Preview path must start with /.');
 const result=new URL(path,origin);
 if(result.origin!==origin)throw Error('Preview path must stay on the configured local server.');
 return result.href;
}
function previewOrigins(port=readPreviewPort(process.env.PREVIEW_PORT)){
 const selected=readPreviewPort(port);
 return new Set(['localhost','127.0.0.1'].map(host=>new URL(`http://${host}:${selected}`).origin));
}
module.exports={readPreviewPort,previewUrl,previewOrigins};
