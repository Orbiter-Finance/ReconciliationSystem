import { isArbNova, isStarknet, isZksynclite, isZkSyncera, isWETHChain ,isChainId} from '../../utils/is'
import { MakerTx } from '../../constant/type'
import getStarknetTxs from './txs/getStarknetTxs'
import getZkSyncliteTxs from './txs/getZkSyncliteTxs'
import getArbNovaScanTxs from './txs/getArbNovaScanTxs'
import getZkSynceraTxs from './txs/getZkSynceraTxs'
import getScanTokenTxs from './txs/getScanTokenTxs'
import getScanTxs from './txs/getScanTxs'
import isMaker from '../../utils/isMaker'
import { ArbNovaTx, ScanTokenTx, ScanTx, StarknetTx, ZkSynceraTx, ZkSyncliteTx } from '../../constant/tx.types'
import moment from 'moment'
import { getFormatDate } from '../../utils/index'
export async function getScanDataByMakerTx(
  makerTx: MakerTx,
  startTime?: number
): Promise<ZkSynceraTx[] | ScanTokenTx[] | ScanTx[] | StarknetTx[] | ZkSyncliteTx[] | ArbNovaTx[] | undefined> {
  const { replyAccount, toChain } = makerTx

  if (!replyAccount || !toChain || !isChainId(toChain)) {
    return undefined
  }

  if (isStarknet(makerTx)) {
    return getStarknetTxs(replyAccount, startTime)
  }

  if (isZksynclite(makerTx)) {
    let list = await getZkSyncliteTxs(replyAccount)
    if (list && list.length) [
      list = list.filter((item) => {
        const timeValid = moment(new Date(item.createdAt)).isAfter(moment(new Date(startTime)))
        return timeValid && isMaker(item.op.from)
      })
    ]
    return list
  }

  if (isArbNova(makerTx)) {
    let list = await getArbNovaScanTxs(replyAccount)
    if (list && list.length) {
      list = list.filter(item => {
        const timeValid = moment(new Date(item.createdAt)).isAfter(moment(new Date(startTime)))
        return timeValid && isMaker(item.from)
      })
    }
    return list
  }

  if (isZkSyncera(makerTx)) {
    let list = await getZkSynceraTxs(replyAccount)
    if (list && list.length) {
      list = list.filter(item => {
        return isMaker(item.from)
      })
    }
    return list
  }

  const toSymbol = makerTx.inData.extra.toSymbol
  const { toTokenAddress } = makerTx.inData.extra?.ua ?? {}
  let list = [];
  if (['DAI', 'USDC', 'USDT'].includes(toSymbol) || isWETHChain(makerTx)) {
    list = await getScanTokenTxs(replyAccount, toTokenAddress, toChain)
  } else {
    list = await getScanTxs(replyAccount, toChain)
  }
  if (list && list.length) {
    list = list.filter(item => {
      const timeValid = (Number(item.timeStamp) * 1000) >= startTime
      item.createdAt = getFormatDate((Number(item.timeStamp) * 1000), 0)
      return timeValid && isMaker(item.from)
    })
  }
  return list || []
}
