import mongoose from 'mongoose'

let Schema = mongoose.Schema;

let fakerMakerTx = new Schema({
    _id: Schema.Types.ObjectId,
    tx_env: String,
    tx_hash: String,
    fake_maker_address: String,
    from_address: String,
    to_address: String,
    token_address: String,
    amount: String,
    bind_status: String,
});

export default mongoose.model('V1', fakerMakerTx, 'v1');