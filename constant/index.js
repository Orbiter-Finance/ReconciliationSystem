const confirmStatus = {
    noConfirm: 'noConfirm',
    successByAdmin: 'successByAdmin',
    failByAdmin: 'failByAdmin'
}

const state = {
    successByMatched: 1,
    successByAdmin: 2,
    failByAdmin: 3,
    failByMulti: 4,
    failByUnknown: 5
}
const chainDesc = ['arbitrum', 'ethereum', 'optimism', 'starknet', 'zksyncera', 'zksynclite','polygon','metis','boba','bsc']


module.exports.confirmStatus = confirmStatus;
module.exports.state = state;
module.exports.chainDesc = chainDesc;