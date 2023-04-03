import { Chains } from '../../../config/chains'
import { ScanTokenTx } from '../../../constant/tx.types'
import axios from 'axios'
import { getTokenTxListURL } from '../../../utils/scan'

export default async function getScanTokenTxs(
  address: string,
  token: string,
  chain: Chains
): Promise<ScanTokenTx[] | undefined> {
  const url = getTokenTxListURL(chain, address, token, {})

  if (!url || !address || !token) {
    return undefined
  }

  try {
    const res = await axios.get(url)

    if (res.data.status === '1' && Array.isArray(res.data.result)) {
      return res.data.result
    }
  } catch (error) {
    console.log('getScanTokenTxs error:', error)
  }

  return undefined
}
