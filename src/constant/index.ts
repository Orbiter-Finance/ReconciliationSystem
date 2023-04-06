
export const confirmStatus = {
    noConfirm: 'noConfirm',
    successByAdmin: 'successByAdmin',
    failByAdmin: 'failByAdmin',
    doubtByAdmin: 'doubtByAdmins'
}

export const state = {
    all: 0,
    successByMatched: 1,
    successByAdmin: 2,
    failByAdmin: 3,
    failByMulti: 4,
    failByUnknown: 5,
    doubtByAdmin: 6
}
export const chainDesc = ['arbitrum', 'ethereum', 'optimism', 'starknet', 'zksyncera', 'zksynclite','polygon','metis','boba','bsc']

export const decimalMap = {
    "ETH": 18,
    "USDT": 6,
    "USDC": 6,
    "DAI": 18,
}

export const failMakerTransactionStatus = {
    matched: 'matched',
    init: 'init',
    warning: 'warning'
}
