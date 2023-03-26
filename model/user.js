const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const user = new Schema({
    id: { type: Number, unique: true },
    name: { type: String, unique: true },
    password: String,
    status: Number, // 0.ban 1.open
    secretKey: String,
    loginTime: Number,
    role: { type: Number, index: true, default: 2 }
});

module.exports = mongoose.model('user', user, 'user');