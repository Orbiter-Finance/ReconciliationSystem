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
    status: { type: String, index: true, default: 'init'}
});

module.exports = mongoose.model('makerTx', makerTx, 'makerTx');