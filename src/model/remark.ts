import mongoose from 'mongoose'

let Schema = mongoose.Schema;

let remark = new Schema({
    transactionId: { type: String, index: true },
    userName: String, // operator's name
    remark: String,
    role: String,
    createdAt: { type: Date, index: true, default: Date.now },
    updatedAt: Date,
});

export default mongoose.model('remark', remark, 'remark');