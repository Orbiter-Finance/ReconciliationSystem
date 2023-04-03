import { BigNumber } from 'ethers'
import StarknetTxModel from '../../../model/starknetTx'
import { StarknetTx } from '../../../constant/tx.types'

export default async function getStarknetTxs(address: string, startTime?: number): Promise<StarknetTx[]> {
  if (!address) {
    return undefined
  }
  const where = {
    'input.6': BigNumber.from(address).toString(),
  }
  if (startTime) {
    where['timestamp'] = { $gte: parseInt((startTime / 1000).toString()) }
  }
  const matcheds = await StarknetTxModel.find(where)

  return matcheds
}