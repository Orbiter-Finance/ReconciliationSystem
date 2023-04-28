import ZkSynceraTxModel from '../../../model/zksynceraTx'
import { ZkSynceraTx } from '../../../constant/tx.types'
import logger from '../../../utils/logger'

export default async function getZkSynceraTxs(address: string, fromList?: string []): Promise<ZkSynceraTx[] | undefined> {
  if (!address) {
    return undefined
  }
  const where: any = {
    to: address.toLowerCase(),
  }
  if (fromList && fromList.length) {
    where.from = { $in: fromList }
  }
  const matcheds = await ZkSynceraTxModel.find(where).limit(1000);
  // logger.info(`getZkSynceraTxs -- ${matcheds.length}`)
  return matcheds
}
