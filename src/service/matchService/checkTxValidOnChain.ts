import { isArbNova, isStarknet, isZksynclite, isZkSyncera, isWETHChain, isChainId } from '../../utils/is'
import { MakerTx } from '../../constant/type'
import { getStarknetTxByHash } from './txs/getStarknetTxs'
import { getZksyncliteTxByHash } from './txs/getZkSyncliteTxs'
import { getArbNovaScanTxByHash } from './txs/getArbNovaScanTxs'
import { getZksynceraTxReceiptByHash } from './txs/getZkSynceraTxs'
import getScanTokenTxs from './txs/getScanTokenTxs'
import { getScanTxStatusByHash } from './txs/getScanTxs'
import { BigNumber } from 'ethers'
import isMaker, { isMaker2, makers } from '../../utils/isMaker'
import { ArbNovaTx, ScanTokenTx, ScanTx, StarknetTx, ZkSynceraTx, ZkSyncliteTx } from '../../constant/tx.types'
import { InvalidTransaction} from '../../model/invalidTransaction'
import { Chains } from '../../config/chains'
import logger from '../../utils/logger'

export async function checkTxValidOnChain(hash: string, chainId: string): Promise<boolean> {
    chainId = String(chainId)
    if (isStarknet(chainId)) {
       return true
    }
    
    if (isZksynclite(chainId)) {
        let tx = await getZksyncliteTxByHash(hash)
        if (tx && tx.fail_reason) {
            return false
        } else {
            return true
        }
    }
    
    if (isArbNova(chainId)) {
        let tx = await getArbNovaScanTxByHash(hash)
        if (tx && tx.status !== 'Confirmed') {
            return false
        } else {
            return true
        }
    }
    
    if (isZkSyncera(chainId)) {
        let tx = await getZksynceraTxReceiptByHash(hash)
        if (tx && tx.status !== '0x1') {
            return false
        } else {
            return true
        }
    }
    const result: any = await getScanTxStatusByHash(hash, chainId as Chains)
    if (result && result.status !== '1' && result.message == 'OK') {
        logger.info(JSON.stringify(result))
        return false
    } 

    return true
} 