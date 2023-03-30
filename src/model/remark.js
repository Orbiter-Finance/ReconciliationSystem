let mongoose = require('mongoose');

let Schema = mongoose.Schema;

let remark = new Schema({
    transactionId: { type: String, index: true },
    userName: String, // operator's name
    remark: String,
    role: String,
    createdAt: { type: Date, index: true, default: Date.now },
    updatedAt: Date,
});

module.exports = mongoose.model('remark', remark, 'remark');