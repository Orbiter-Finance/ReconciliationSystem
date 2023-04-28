import ZkSynceraTxModel from '../../../model/zksynceraTx'
import { ZkSynceraTx } from '../../../constant/tx.types'
import logger from '../../../utils/logger'

export default async function getZkSynceraTxs(address: string): Promise<ZkSynceraTx[] | undefined> {
  if (!address) {
    return undefined
  }

  const matcheds = await ZkSynceraTxModel.find({
    to: address.toLowerCase(),
  })
  logger.info(`getZkSynceraTxs -- ${matcheds.length}`)
  return matcheds
}
