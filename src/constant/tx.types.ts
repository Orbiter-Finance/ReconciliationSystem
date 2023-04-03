export interface ZkSynceraTx {
    blockHash?: string
    from?: string
    to?: string
    timestamp?: number
    input?: string
    value?: string
    hash?: string
  }
  
  export interface ScanTx {
    blocknumber: string
    timeStamp: string
    hash: string
    nonce: string
    blockHash: string
    transactionIndex: string
    from: string
    to: string
    value: string
    gas: string
    gasPrice: string
    isError: string
    txreceipt_status: string
    input: string
    contractAddress: string
    cumulativeGasUsed: string
    gasUsed: string
    confirmations: string
    methodId: string
    functionName: string
  }
  
  export interface ScanTokenTx {
    blockNumber: string
    timeStamp: string
    hash: string
    nonce: string
    blockHash: string
    from: string
    contractAddress: string
    to: string
    value: string
    tokenName: string
    tokenSymbol: string
    tokenDecimal: string
    transactionIndex: string
    gas: string
    gasPrice: string
    gasUsed: string
    cumulativeGasUsed: string
    input: string
    confirmations: string
  }
  
  export interface StarknetTx {
    _id?: string
    block_hash?: string
    block_number?: number
    calldata?: string[]
    class_hash?: string
    sender_address?: string
    timestamp?: number
    input?: string[]
    hash?: string
  }
  
  export interface ArbNovaTx {
    from?: string
    to?: string
    createdAt?: string
    hash?: string
    blockNumber?: string
    amount?: string
    symbol?: string
    size?: string
  }
  
  export interface ZkSyncliteTx {
    txHash: string
    hash?: string
    blockIndex: number
    blockNumber: number
    op: {
      type: 'Swap' | 'Transfer'
      accountId: number
      from: string
      to: string
      token: number
      amount: string
      fee: string
      nonce: number
      validFrom: number
      validUntil: number
      signature: {
        pubKey: string
        signature: string
      }
    }
    status: string
    failReason: null | string
    createdAt: string
    batchId: null
  }
  