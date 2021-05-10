import JSZip, { files } from 'jszip';
import parser from 'fast-xml-parser';

export async function xmlToJson(file: File): Promise<Record<string, any>> {
  var zip = new JSZip();
  let zipContents = await zip.loadAsync(file);
  let zipFiles: Record<string, any> = {};
  for (let [relPath, innerFile] of Object.entries(zipContents.files)) {
    console.log("Parsing file...", {filename: file.name, relPath});
    try {
      let fileText = await innerFile.async("string");
      var jsonObject = parser.parse(fileText, {
        ignoreAttributes: true,
      });
      zipFiles[relPath] = jsonObject;
    } catch {
      console.error("Unable to parse.")
    }
  };
  return zipFiles;
}
