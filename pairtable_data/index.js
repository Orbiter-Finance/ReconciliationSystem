const fs = require('fs');
const path = require('path');
const _ = require('lodash')
const directoryPath = path.resolve(__dirname);

function main() {
    let bigJson = []
    files = fs.readdirSync(directoryPath)
    const jsonFiles = files.filter(function(file) {
        return path.extname(file) === '.json';
    })
    jsonFiles.map((item) => {
        console.log(item)
        const fileName = item.replace('\\', '');
        console.log('--------', fileName)
        const json = require(`./${fileName}`);
        // const filePath = path.join(directoryPath, item);
        // const jsonData = fs.readFileSync(filePath, 'utf8')
        bigJson = bigJson.concat(json);
    })
    const uniqList = _.uniqBy(bigJson, 'transcationId')
    fs.writeFileSync('../target.json', JSON.stringify(uniqList, undefined, '\t'))
}
main()