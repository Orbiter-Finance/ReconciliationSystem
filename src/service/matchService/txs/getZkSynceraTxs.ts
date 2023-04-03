import ZkSynceraTxModel from '../../../model/zksynceraTx'
import { ZkSynceraTx } from '../../../constant/tx.types'

export default async function getZkSynceraTxs(address: string): Promise<ZkSynceraTx[] | undefined> {
  if (!address) {
    return undefined
  }

  const matcheds = await ZkSynceraTxModel.find({
    to: address.toLowerCase(),
  })

  return matcheds
}
