import mongoose from "mongoose"; 
const Schema = mongoose.Schema;

const user = new Schema({
    name: { type: String, unique: true },
    password: String,
    status: Number, // 0.ban 1.open
    secretKey: String,
    loginTime: Number,
    role: { type: Number, default: 2 }
});

export default mongoose.model('user', user, 'user');