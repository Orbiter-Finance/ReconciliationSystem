let mongoose = require('mongoose');

let Schema = mongoose.Schema;

let failMakerTransaction = new Schema({
    id: { type: Number, unique: true },
    transcationId: String,
    inId: Number,
    outId: Number,
    fromChain: String,
    toChain: String,
    toAmount: String,
    replySender: String,
    replyAccount: String,
    createdAt: { type: Date, index: true },
    updatedAt: Date,
    inData: Object,
    matchedTx: Object,
    matchedScanTx: Object,
    warnTxList: { type: Array, default: [] },
    userLog: Object, // { uid name hash updateStatus role updateTime }
    status: { type: String, index: true, default: 'init'}, // init matched warning
    confirmStatus: { type: String, index: true, default: 'noConfirm' }, // noConfirm, successByAdmin,failByAdmin
});

export default mongoose.model('failMakerTransaction', failMakerTransaction, 'failMakerTransaction');