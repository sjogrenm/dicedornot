"use strict";zip.workerScriptsPath="/js/lib/zipjs/";var io={xmlToJson:function xmlToJson(a,b,c){zip.createReader(new zip.BlobReader(fileInput.files[0]),(function(a){a.getEntries((function(d){return 0==d.length?void c("No entries from reader"):void d[0].getData(new zip.TextWriter,(function(c){var d=textToJson(c);a.close((function(){})),b(d)}),(function(){}))}))}),(function(a){console.error("Error reading ZIP"),console.error(a),c("Could not extract ZIP file")}))}};function textToJson(a){var b=new DOMParser,c=b.parseFromString(a,"text/xml"),d=getJXONTree(c);return d}function parseText(a){return/^\s*$/.test(a)?null:/^(?:true|false)$/i.test(a)?"true"===a.toLowerCase():isFinite(a)?parseFloat(a):a}function getJXONTree(a){var b=!0,c=0,d="";if(a.hasChildNodes())for(var e,f,g,h=0;h<a.childNodes.length;h++)e=a.childNodes.item(h),4===e.nodeType?d+=e.nodeValue:3===e.nodeType?d+=e.nodeValue.trim():1===e.nodeType&&!e.prefix&&(0===c&&(b={}),f=e.nodeName.toLowerCase(),g=getJXONTree(e),b.hasOwnProperty(f)?(b[f].constructor!==Array&&(b[f]=[b[f]]),b[f].push(g)):(b[f]=g,c++));return d&&(0<c?b.keyValue=parseText(d):b=parseText(d)),b}