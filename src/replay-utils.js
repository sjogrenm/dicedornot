
export function ensureList(objOrList) {
    if (objOrList && objOrList.length) {
        return objOrList;
    } else if (objOrList) {
        return [objOrList];
    } else {
        return [];
    }
}

export function translateStringNumberList(str) {
    if (!str) return [];

    var stripped = str.substring(1, str.length - 1);
    var textList = stripped.split(",");

    var numberList = [];
    for (var i = 0; i < textList.length; i++) {
        numberList.push(parseInt(textList[i]));
    }
    return numberList;
}
