let mongoose = require('mongoose');

let Schema = mongoose.Schema;

let makerTx = new Schema({
    id: { type: Number, unique: true },
    transcationId: String,
    inId: Number,
    outId: Number,
    fromChain: String,
    toChain: String,
    toAmount: String,
    replySender: String,
    replyAccount: String,
    createdAt: Date,
    updatedAt: Date,
    matchedTx: Object,
    confirmTx: String,
    status: { type: String, index: true, default: 'init'},
    confirmStatus: { type: String, index: true, default: 'noConfirm' }, // noConfirm, successByAdmin,failByAdmin
});

module.exports = mongoose.model('makerTx', makerTx, 'makerTx');