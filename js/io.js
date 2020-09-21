export const io = {
  xmlToJson: function (file, doneCallback, errorCallback) {
    JSZip.loadAsync(file).then((zip) => {
      zip.forEach((relPath, file) => {
        file.async("string").then((text) => {
          var jsonObject = textToJson(text);
          console.log(jsonObject);
          doneCallback(jsonObject);
        });
      });
    });
  },
};

function textToJson(text) {
  var parser = new DOMParser();
  var xmlDom = parser.parseFromString(text, "text/xml");
  var jsTree = getJXONTree(xmlDom);
  //console.log(jsTree);
  return jsTree;
}

// https://developer.mozilla.org/en-US/docs/JXON#Algorithm_.233.3A_a_synthetic_technique
function parseText(sValue) {
  if (/^\s*$/.test(sValue)) {
    return null;
  }
  if (/^(?:true|false)$/i.test(sValue)) {
    return sValue.toLowerCase() === "true";
  }
  if (isFinite(sValue)) {
    return parseFloat(sValue);
  }
  //this will convert text that contains a dot to bogus dates if (isFinite(Date.parse(sValue))) { return new Date(sValue); }
  return sValue;
}
function getJXONTree(oXMLParent) {
  var vResult = /* put here the default value for empty nodes! */ true,
    nLength = 0,
    sCollectedTxt = "";
  /*
	if (oParentNode.hasAttributes && oXMLParent.hasAttributes()) {
		vResult = {};
		for (nLength; nLength < oXMLParent.attributes.length; nLength++) {
			oAttrib = oXMLParent.attributes.item(nLength);
			vResult["@" + oAttrib.name.toLowerCase()] = parseText(oAttrib.value.trim());
		}
	}
	*/
  if (oXMLParent.hasChildNodes()) {
    for (
      var oNode, sProp, vContent, nItem = 0;
      nItem < oXMLParent.childNodes.length;
      nItem++
    ) {
      oNode = oXMLParent.childNodes.item(nItem);
      if (oNode.nodeType === 4) {
        sCollectedTxt += oNode.nodeValue;
      } /* nodeType is "CDATASection" (4) */ else if (oNode.nodeType === 3) {
        sCollectedTxt += oNode.nodeValue.trim();
      } /* nodeType is "Text" (3) */ else if (
        oNode.nodeType === 1 &&
        !oNode.prefix
      ) {
        /* nodeType is "Element" (1) */
        if (nLength === 0) {
          vResult = {};
        }
        sProp = oNode.nodeName.toLowerCase();
        vContent = getJXONTree(oNode);
        if (vResult.hasOwnProperty(sProp)) {
          if (vResult[sProp].constructor !== Array) {
            vResult[sProp] = [vResult[sProp]];
          }
          vResult[sProp].push(vContent);
        } else {
          vResult[sProp] = vContent;
          nLength++;
        }
      }
    }
  }
  if (sCollectedTxt) {
    nLength > 0
      ? (vResult.keyValue = parseText(sCollectedTxt))
      : (vResult = parseText(sCollectedTxt));
  }
  /* if (nLength > 0) { Object.freeze(vResult); } */
  return vResult;
}
