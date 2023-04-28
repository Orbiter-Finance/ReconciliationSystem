import { BigNumber } from 'ethers'
import StarknetTxModel from '../../../model/starknetTx'
import { StarknetTx } from '../../../constant/tx.types'
import logger from '../../../utils/logger'

export default async function getStarknetTxs(address: string, startTime?: number, toAmount?: string, makerList?: string[]): Promise<StarknetTx[]> {
  if (!address) {
    return undefined
  }
  const where:any = {
    'input.6': BigNumber.from(address).toString(),
  }
  if (toAmount) {
    const toAmount2 = toAmount.slice(0, toAmount.length - 4) + '0000'
    where.$or = [
      { 'input.7': toAmount },
      { 'input.7': toAmount2 }
    ]
  }
  if (startTime) {
    where['timestamp'] = { $gte: parseInt((startTime / 1000).toString()) }
  }
  if (makerList && makerList.length) {
    where['sender_address'] = { $in: makerList }
  }
  const matcheds = await StarknetTxModel.find(where).sort({ timestamp: -1 }).limit(300)
  // logger.info(`getStarknetTxs --- ${matcheds.length}`)
  return matcheds
}
