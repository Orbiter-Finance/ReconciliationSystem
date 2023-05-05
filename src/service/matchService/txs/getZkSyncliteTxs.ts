import { ZK_SYNCLITE_SCAN_URL } from '../../../config/scan'
import { ZkSyncliteTx, ZkSyncliteApiTxType } from '../../../constant/tx.types'
import axios from 'axios'
import logger from '../../../utils/logger'
export default async function getZkSyncliteTxs(userAddress: string): Promise<ZkSyncliteTx[] | undefined> {
  const url = `${ZK_SYNCLITE_SCAN_URL}/v0.2/accounts/${userAddress}/transactions?from=latest&limit=100&direction=older`
  if (!userAddress) {
    return undefined
  }

  try {
    const res = await axios.get(url)
    if (res.data.status === 'success' && Array.isArray(res.data.result.list)) {
      return res.data.result.list.filter((item: ZkSyncliteTx) => {
        if (item.failReason !== null || item.op.type !== 'Transfer') {
          return false
        }
        return true
      })
    }
  } catch (error) {
    logger.error('getZkSyncliteTxs error:', error)
  }

  return undefined
}



export async function getZksyncliteTxByHash(hash: string): Promise<ZkSyncliteApiTxType | undefined> {
  const url = `https://api.zksync.io/api/v0.1/transactions_all/${hash}`
  try {
    const res = await axios.get<ZkSyncliteApiTxType>(url);
    const tx = res.data
    if (!tx) {
      return undefined
    }
    return tx
  } catch (error) {
     logger.info(`getZksyncliteTxByHash: ${hash}, error`, error )
     return undefined
  }
}
