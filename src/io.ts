import JSZip, { files } from 'jszip';
import parser from 'fast-xml-parser';

export async function* xmlToJson<T>(file): AsyncGenerator<T> {
  var zip = new JSZip();
  let zipContents = await zip.loadAsync(file);
  for (let [relPath, innerFile] of Object.entries(zipContents.files)) {
    let fileText = await innerFile.async("string");
    var jsonObject = parser.parse(fileText, {
      ignoreAttributes: true,
    });
    console.log({filename: file.name, relPath, jsonObject});
    yield jsonObject;
  };
}
