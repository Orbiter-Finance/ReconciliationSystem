
const txList = require('./tx.json')

const getList = async (page = 0, limit = 10, fromTxHash) => {
    let _txlist = txList
    if (fromTxHash) {
        let item = _txlist.find(item => item.fromTx === fromTxHash);
        _txlist = [item]
    }
    let list = _txlist.slice(page * limit, (page+1) * limit)
    return list
}

module.exports.getList = getList;