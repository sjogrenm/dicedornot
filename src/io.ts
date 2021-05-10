import JSZip, { files } from 'jszip';
import parser from 'fast-xml-parser';

export async function* xmlToJson<T>(file: File): AsyncGenerator<T> {
  var zip = new JSZip();
  let zipContents = await zip.loadAsync(file);
  for (let [relPath, innerFile] of Object.entries(zipContents.files)) {
    console.log("Parsing file...", {filename: file.name, relPath});
    try {
      let fileText = await innerFile.async("string");
      var jsonObject = parser.parse(fileText, {
        ignoreAttributes: true,
      });
      yield jsonObject;
    } catch {
      console.error("Unabel to parse.")
    }
  };
}
