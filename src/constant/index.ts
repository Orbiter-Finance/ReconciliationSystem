
export const confirmStatus = {
    noConfirm: 'noConfirm',
    successByAdmin: 'successByAdmin',
    failByAdmin: 'failByAdmin',
    failByAdminAndAutoReply: 'failByAdminAndAutoReply',
    manualReplyByAdmin: 'manualReplyByAdmin',
    doubtByAdmin: 'doubtByAdmins'
}
 
export const state = {
    all: 0,
    successByMatched: 1,
    successByAdmin: 2,
    failByAdmin: 3,
    failByMulti: 4,
    failByUnknown: 5,
    doubtByAdmin: 6,
    failByAdminAndAutoReply: 7,
    manualReplyByAdmin: 8,
}

export const invalidTransactionState = {
    all: 0,
    matched: 1,
    noMatched: 2,
    multiMatched: 3,
    successByAdmin: 4,
    autoReply: 5,
    ignoreByAdmin: 6,
    replyByAdmin: 7,
}

export const invalidTransactionConfirmStatus = {
    noConfirm: 'noConfirm',
    successByAdmin: 'successByAdmin',
    replyByAdmin: 'replyByAdmin',
    autoReply: 'autoReply',
    ignoreByAdmin: 'ignoreByAdmin',
}

export const abnormalOutTransactionState = {
    all: 0,
    noConfirm: 1,
    successByAdmin: 2,
    failByAdmin: 3,
}

export const abnormalOutTransactionConfirmStatus = {
    noConfirm: 'noConfirm',
    successByAdmin: 'successByAdmin',
    failByAdmin: 'failByAdmin',
}
 

export enum invalidTransactionSubmitStatus {
    noConfirm = 0,
    successByAdmin = 1,
    autoReply = 2,
    ignoreByAdmin = 3,
    replyByAdmin = 4,
}

export enum abnormalOutTransactionSubmitStatus {
    noConfirm = 0,
    successByAdmin = 1,
    failByAdmin = 2,
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
