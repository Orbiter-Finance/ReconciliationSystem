
import mongoose from 'mongoose'
export type InvalidTransaction = {
    id: number,
    hash: string,
    nonce: number,
    blockHash: string,
    blockNumber: number,
    transactionIndex: number,
    from: string,
    to: string,
    value: string,
    symbol: string,
    gasPrice: number,
    gas: number,
    input: string,
    status: number,
    tokenAddress: string,
    timestamp: Date,
    side: number,
    fee: string,
    feeToken: string,
    chainId: number,
    source: string,
    memo: string,
    expectValue: string,
    makerId: string,
    transferId: string,
    lpId: string,
    extra: Object,
    // "extra": {
    //   "ua": {
    //     "toTokenAddress": "0x0000000000000000000000000000000000000000"
    //   },
    //   "ebcId": "",
    //   "server": "E4E",
    //   "toSymbol": "ETH"
    // },
    replyAccount: string,
    replySender: string,
    createdAt: Date,
    updatedAt: Date,

    matchedTxHash: string,
    warnTxList: Array<string>,
    matchedTx: Object,
    userLog: Object, // { uid name hash updateStatus role updateTime }
    matchStatus: string, // init, matched, warning
    signature: string,
    autoReplyStatus: string, // init. fail, success
    autoReplyFailMsg: string,
    autoReplyHash: string,
    confirmStatus: string, // noConfirm, successByAdmin,failByAdmin

}
let Schema = mongoose.Schema;
let InvalidTransaction = new Schema<InvalidTransaction>({
    id: { type: Number, unique: true },
    hash: { type: String, unique: true },
    nonce: Number,
    blockHash: String,
    blockNumber: Number,
    transactionIndex: Number,
    from: String,
    to: String,
    value: String,
    symbol: String,
    gasPrice: Number,
    gas: Number,
    input: String,
    status: Number,
    tokenAddress: String,
    timestamp: Date,
    side: Number,
    fee: String,
    feeToken: String,
    chainId: Number,
    source: String,
    memo: String,
    expectValue: String,
    makerId: String,
    transferId: String,
    lpId: String,
    extra: Object,
    // "extra": {
    //   "ua": {
    //     "toTokenAddress": "0x0000000000000000000000000000000000000000"
    //   },
    //   "ebcId": "",
    //   "server": "E4E",
    //   "toSymbol": "ETH"
    // },

    replyAccount: String,
    replySender: String,
    createdAt: Date,
    updatedAt: Date,

    matchedTxHash: { type: String, index: true },
    matchedTx: Object,
    warnTxList: { type: [String], default: [] },
    userLog: Object, // { uid name hash updateStatus role updateTime }
    matchStatus: { type: String, index: true, default: 'init'}, // init, matched, warning
    signature: String,
    autoReplyStatus: { type: String, default: 'init' }, // init. fail, success
    autoReplyFailMsg: String,
    autoReplyHash: String,
    confirmStatus: { type: String, index: true, default: 'noConfirm' }, // noConfirm, successByAdmin,failByAdmin
  });

export default mongoose.model('invalidTransaction', InvalidTransaction, 'invalidTransaction');