import ZkSynceraTxModel from '../../../model/zksynceraTx'
import zksynceraTxReceiptModel, { ZkSyncEraTxReceiptType } from '../../../model/zksynceraTxReceipt'
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


export async function getZksynceraTxReceiptByHash(hash: string): Promise<ZkSyncEraTxReceiptType | undefined> {
  const doc = await zksynceraTxReceiptModel.findOne({_id: hash});
  return doc
}
