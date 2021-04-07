import JSZip, { files } from 'jszip';
import parser from 'fast-xml-parser';
var zip = new JSZip();

export async function* xmlToJson<T>(file): AsyncGenerator<T> {
  let zipContents = await zip.loadAsync(file);
  for (let [relPath, file] of Object.entries(zipContents.files)) {
    let fileText = await file.async("string");
    var jsonObject = parser.parse(fileText, {
      ignoreAttributes: true,
    });
    console.log(jsonObject);
    yield jsonObject;
  };
}
