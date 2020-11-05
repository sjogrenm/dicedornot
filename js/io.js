export const io = {
  xmlToJson: function (file, doneCallback, errorCallback) {
    JSZip.loadAsync(file).then((zip) => {
      zip.forEach((relPath, file) => {
        file.async("string").then((text) => {
          var jsonObject = parser.parse(text, {
            ignoreAttributes: true,
          });
          console.log(jsonObject);
          doneCallback(jsonObject);
        });
      });
    });
  },
};
