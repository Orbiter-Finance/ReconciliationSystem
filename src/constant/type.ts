import { ScanTx, StarknetTx, ZkSynceraTx, ZkSyncliteTx } from './tx.types'

export interface IResponse<T> {
  status: string
  message: string
  result: T
}

export type MakerTx = Partial<{
  confirmStatus: string // 'noConfirm' | 'successByAdmin' | 'failByAdmin' | 'doubtByAdmins'
  createdAt: Date
  fromChain: string
  id: number
  inData: InData
  inId: number
  matchedScanTx: StarknetTx | ScanTx | ZkSynceraTx | ZkSyncliteTx | null
  outId: number | null
  remarkList: any[]
  replyAccount: string
  replySender: string
  status: string // 'init' | 'matched' | 'warning'
  toAmount: string
  toChain: string
  transcationId: string
  updatedAt: Date
  warnTxList: string[]
}>

export interface InData {
  blockHash: string
  blocknumber: number
  chainId: string
  createdAt: string
  expectValue: string
  extra: { ua: { toTokenAddress: string }; ebcId: string; toSymbol: string }
  fee: string
  feeToken: string
  from: string
  gas: number
  gasPrice: number
  hash: string
  id: number
  input: null
  lpId: null
  makerId: null
  memo: string
  nonce: number
  replyAccount: string
  replySender: string
  side: number
  source: string
  status: number
  symbol: string
  timestamp: string
  to: string
  tokenAddress: string
  transactionIndex: number
  transferId: string
  updatedAt: string
  value: string
}

export interface IDoneCallbackBody {
  transactionId: String,
  failMessage: String,
  hash: String,
  status: 'success' | 'fail'
}