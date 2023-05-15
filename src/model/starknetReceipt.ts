import mongoose from 'mongoose'
import * as db2 from './initdb2'
let Schema = mongoose.Schema;
export type StarknetReceiptType = {
    _id : string,
    actual_fee : string,
    actual_fee_deci : string,
    events: [
        {
        from_address : string,
        keys : [
            string
        ],
        data : string[]
    }],
    execution_resources : {
        n_steps : number,
        builtin_instance_counter : {
            pedersen_builtin : number,
            range_check_builtin : number
        },
        n_memory_holes : number
    },
    l2_to_l1_messages : string[],
    transaction_hash : string,
    transaction_index : number
}
let starknetReceipt = new Schema<StarknetReceiptType>({
    _id : String,
    actual_fee : String,
    actual_fee_deci : String,
    events: [
        {
        from_address : String,
        keys : [
            String
        ],
        data : [String]
    }],
    execution_resources : {
        n_steps : Number,
        builtin_instance_counter : {
            pedersen_builtin : Number,
            range_check_builtin : Number
        },
        n_memory_holes : Number
    },
    l2_to_l1_messages : [String],
    transaction_hash : String,
    transaction_index : Number
});

export default db2.startnetReceiptConnection.model("starknet_receipt", starknetReceipt, "starknet_receipt");

const ss = '0x1928d53105d1df7da7166a4054ae0aa240f5bc310002eth0'