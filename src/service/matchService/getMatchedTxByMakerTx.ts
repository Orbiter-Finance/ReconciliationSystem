import { isArbNova, isStarknet, isZksynclite, isZkSyncera, isWETHChain, isChainId } from '../../utils/is'
import { MakerTx } from '../../constant/type'
import getStarknetTxs from './txs/getStarknetTxs'
import getZkSyncliteTxs from './txs/getZkSyncliteTxs'
import getArbNovaScanTxs from './txs/getArbNovaScanTxs'
import getZkSynceraTxs from './txs/getZkSynceraTxs'
import getScanTokenTxs from './txs/getScanTokenTxs'
import getScanTxs from './txs/getScanTxs'
import { BigNumber } from 'ethers'
import isMaker, { isMaker2, makers } from '../../utils/isMaker'
import { ArbNovaTx, ScanTokenTx, ScanTx, StarknetTx, ZkSynceraTx, ZkSyncliteTx } from '../../constant/tx.types'
import { InvalidTransaction} from '../../model/invalidTransaction'
import { StarknetReceiptType } from '../../model/starknetReceipt'
export async function getMatchedTxByMakerTx(
  makerTx: MakerTx
): Promise<ZkSynceraTx[] | ScanTokenTx[] | ScanTx[] | StarknetTx[] | ZkSyncliteTx[] | ArbNovaTx[] | undefined> {
  const { replyAccount, toAmount, toChain, inData } = makerTx
  if (!replyAccount || !isChainId(toChain) || !toAmount) {
    return undefined
  }

  if (isStarknet(makerTx)) {
    const amount = toAmount.slice(0, makerTx.toAmount.length - 4) + '0000'
    const failTxTime = new Date(inData.timestamp).getTime();
    const txs = await getStarknetTxs(replyAccount, failTxTime, toAmount, makers)

    return txs
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
    const txs = await getZkSynceraTxs(replyAccount, makers)

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


export async function getMatchedTxByInvalidReceiveTransaction(
  tx: InvalidTransaction
  ): Promise<ZkSynceraTx[] | ScanTokenTx[] | ScanTx[] | StarknetTx[] | StarknetReceiptType[] | ZkSyncliteTx[] | ArbNovaTx[] | undefined> {
  const { from, value, symbol, tokenAddress } = tx
  let chainId = String(tx.chainId)
  if (!from || !isChainId(chainId) || !chainId) {
    return undefined
  }

  if (isStarknet(chainId)) {

    const txTime = new Date(tx.timestamp).getTime()
    const txs = await getStarknetTxs(from, txTime, value, makers)
    return txs
  }

  if (isZksynclite(chainId)) {
    const txs = await getZkSyncliteTxs(from)

    return txs?.filter((item) => {
      try {
        if (BigNumber.from(value).eq(item.op.amount) && isMaker2(item.op.from)) {
          return true
        }
        return false
      } catch (error) {
        return false
      }
    })
  }

  if (isArbNova(chainId)) {
    const txs = await getArbNovaScanTxs(from)

    return txs?.filter((item) => {
      try {
        if (BigNumber.from(value).eq(item.amount) && isMaker2(item.from)) {
          return true
        }
      } catch (error) {
        return false
      }
    })
  }

  if (isZkSyncera(chainId)) {
    const txs = await getZkSynceraTxs(from)

    return txs?.filter((item) => {
      try {
        if (BigNumber.from(value).eq(item.value) && isMaker2(item.from)) {
          return true
        }
      } catch (error) {
        return false
      }
    })
  }

  if ((['DAI', 'USDC', 'USDT'].includes(symbol) || isWETHChain(chainId))) {
    const txs = await getScanTokenTxs(from, tokenAddress, chainId)

    return txs?.filter((item) => {
      try {
        if (BigNumber.from(value).eq(item.value) && isMaker2(item.from)) {
          return true
        }
      } catch (error) {
        return false
      }
    })
  }
  const txs = await getScanTxs(from, chainId)

  if (txs) {
    return txs?.filter((item) => {
      try {
        if (BigNumber.from(value).eq(item.value) && isMaker2(item.from)) {
          return true
        }
      } catch (error) {
        return false
      }
    })
  }

  return []
}
