export type ZkSyncEraTxReceiptType = {
    _id : String,
    actual_fee_deci : Number,
    blockHash : String,
    blockNumber : String,
    contractAddress : String,
    cumulativeGasUsed : String,
    effectiveGasPrice : String,
    from : String,
    gasUsed : String,
    l1BatchNumber : String,
    l1BatchTxIndex : String,
    l2ToL1Logs : [
        {
            blockHash : String,
            blockNumber : String,
            isService : boolean,
            key : String,
            l1BatchNumber : String,
            logIndex : String,
            sender : String,
            shardId : String,
            transactionHash : String,
            transactionIndex : String,
            transactionLogIndex : String,
            value : String
        }
    ],
    logs : [
        {
            address : String,
            blockHash : String,
            blockNumber : String,
            data : String,
            l1BatchNumber : String,
            logIndex : String,
            logType : String,
            removed : boolean,
            topics : String[],
            transactionHash : String,
            transactionIndex : String,
            transactionLogIndex : String
        }
    ],
    logsBloom : String,
    root : String,
    status : String,
    to : String,
    transactionHash : String,
    transactionIndex : String,
    type : String
}



import mongoose from "mongoose"; 
import * as  db2 from "./initdb2";
let Schema = mongoose.Schema;



let ZkSyncEraTxReceipt = new Schema<ZkSyncEraTxReceiptType>({
    _id : String,
    actual_fee_deci : Number,
    blockHash : String,
    blockNumber : String,
    contractAddress : String,
    cumulativeGasUsed : String,
    effectiveGasPrice : String,
    from : String,
    gasUsed : String,
    l1BatchNumber : String,
    l1BatchTxIndex : String,
    l2ToL1Logs : [
        {
            blockHash : String,
            blockNumber : String,
            isService : Boolean,
            key : String,
            l1BatchNumber : String,
            logIndex : String,
            sender : String,
            shardId : String,
            transactionHash : String,
            transactionIndex : String,
            transactionLogIndex : String,
            value : String
        }
    ],
    logs : [
        {
            address : String,
            blockHash : String,
            blockNumber : String,
            data : String,
            l1BatchNumber : String,
            logIndex : String,
            logType : String,
            removed : Boolean,
            topics : [String],
            transactionHash : String,
            transactionIndex : String,
            transactionLogIndex : String
        }
    ],
    logsBloom : String,
    root : String,
    status : String,
    to : String,
    transactionHash : String,
    transactionIndex : String,
    type : String
}
);

export default db2.zksynceraConnection.model("zksyncera_recepit", ZkSyncEraTxReceipt, "zksyncera_recepit");
