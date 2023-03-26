const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userLog = new Schema({
    id: { type: Number, unique: true },
    uid: { type: Number, index: true },
    name: String,
    makerTxId: { type: String, index: true },
    updateTime: Number
});

module.exports = mongoose.model('userLog', userLog, 'userLog');