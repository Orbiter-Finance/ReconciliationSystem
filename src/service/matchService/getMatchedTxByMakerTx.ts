import { isArbNova, isStarknet, isZksynclite, isZkSyncera, isWETHChain, isChainId } from '../../utils/is'
import { MakerTx } from '../../constant/type'
import getStarknetTxs from './txs/getStarknetTxs'
import getZkSyncliteTxs from './txs/getZkSyncliteTxs'
import getArbNovaScanTxs from './txs/getArbNovaScanTxs'
import getZkSynceraTxs from './txs/getZkSynceraTxs'
import getScanTokenTxs from './txs/getScanTokenTxs'
import getScanTxs from './txs/getScanTxs'
import { BigNumber } from 'ethers'
import isMaker from '../../utils/isMaker'
import { ArbNovaTx, ScanTokenTx, ScanTx, StarknetTx, ZkSynceraTx, ZkSyncliteTx } from '../../constant/tx.types'

export async function getMatchedTxByMakerTx(
  makerTx: MakerTx
): Promise<ZkSynceraTx[] | ScanTokenTx[] | ScanTx[] | StarknetTx[] | ZkSyncliteTx[] | ArbNovaTx[] | undefined> {
  const { replyAccount, toAmount, toChain } = makerTx
  if (!replyAccount || !isChainId(toChain) || !toAmount) {
    return undefined
  }

  if (isStarknet(makerTx)) {
    const amount = toAmount.slice(0, makerTx.toAmount.length - 4) + '0000'

    const txs = await getStarknetTxs(replyAccount)

    return txs?.filter((item) => item?.input?.[7] === amount || item?.input?.[7] === toAmount)
  }

  if (isZksynclite(makerTx)) {
    const txs = await getZkSyncliteTxs(replyAccount)

    return txs?.filter((item) => {
      try {
        if (BigNumber.from(toAmount).eq(item.op.amount) && isMaker(item.op.from)) {
          return true
        }
        return false
      } catch (error) {
        return false
      }
    })
  }

  if (isArbNova(makerTx)) {
    const txs = await getArbNovaScanTxs(replyAccount)

    return txs?.filter((item) => {
      try {
        if (BigNumber.from(toAmount).eq(item.amount) && isMaker(item.from)) {
          return true
        }
      } catch (error) {
        return false
      }
    })
  }

  if (isZkSyncera(makerTx)) {
    const txs = await getZkSynceraTxs(replyAccount)

    return txs?.filter((item) => {
      try {
        if (BigNumber.from(toAmount).eq(item.value) && isMaker(item.from)) {
          return true
        }
      } catch (error) {
        return false
      }
    })
  }

  const toSymbol = makerTx.inData.extra.toSymbol
  const { toTokenAddress } = makerTx.inData.extra?.ua ?? {}

  if ((['DAI', 'USDC', 'USDT'].includes(toSymbol) || isWETHChain(makerTx))) {
    const txs = await getScanTokenTxs(replyAccount, toTokenAddress, toChain)

    return txs?.filter((item) => {
      try {
        if (BigNumber.from(toAmount).eq(item.value) && isMaker(item.from)) {
          return true
        }
      } catch (error) {
        return false
      }
    })
  }

  // Ethereum | L2
  const txs = await getScanTxs(replyAccount, toChain)

  if (txs) {
    return txs?.filter((item) => {
      try {
        if (BigNumber.from(toAmount).eq(item.value) && isMaker(item.from)) {
          return true
        }
      } catch (error) {
        return false
      }
    })
  }

  return []
}
