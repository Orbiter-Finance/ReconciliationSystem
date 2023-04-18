import { Chains } from '../../../config/chains'
import { ScanTx } from '../../../constant/tx.types'
import axios from 'axios'
import { getScanTxListURL } from '../../../utils/scan'
import logger from '../../../utils/logger'
export default async function getScanTxs(address: string, chain: Chains): Promise<ScanTx[] | undefined> {
  const url = getScanTxListURL(chain, address, {})

  if (!url) {
    return undefined
  }

  try {
    const res = await axios.get(url)

    if (res.data.status === '1' && Array.isArray(res.data.result)) {
      return res.data.result
    }
  } catch (error) {
    logger.error(`getScanTxs url:${url} error:`, error)
  }

  return undefined
}
