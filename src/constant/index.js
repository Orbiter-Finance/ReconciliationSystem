const confirmStatus = {
    noConfirm: 'noConfirm',
    successByAdmin: 'successByAdmin',
    failByAdmin: 'failByAdmin',
    doubtByAdmin: 'doubtByAdmins'
}

const state = {
    successByMatched: 1,
    successByAdmin: 2,
    failByAdmin: 3,
    failByMulti: 4,
    failByUnknown: 5,
    doubtByAdmin: 6
}
const chainDesc = ['arbitrum', 'ethereum', 'optimism', 'starknet', 'zksyncera', 'zksynclite','polygon','metis','boba','bsc']

const decimalMap = {
    "ETH": 18,
    "USDT": 6,
    "USDC": 6,
    "DAI": 18,
}

module.exports.confirmStatus = confirmStatus;
module.exports.state = state;
module.exports.chainDesc = chainDesc;
module.exports.decimalMap = decimalMap;