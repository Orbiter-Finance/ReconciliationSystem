import { MakerTx } from '../constant/type'
import { Chains } from '../config/chains'

export const isChainId = function (id: any): id is Chains {
  return [...Object.values(Chains)].includes(id)
}

const isStarknet = function (makerTx: MakerTx) {
  if (makerTx.toChain && makerTx.toChain === Chains.Starknet) {
    return true
  }
  return false
}

const isZkSyncera = function (makerTx: MakerTx) {
  if (makerTx.toChain && makerTx.toChain === Chains.ZkSyncera) {
    return true
  }
  return false
}

const isZksynclite = function (makerTx: MakerTx) {
  if (makerTx.toChain && makerTx.toChain === Chains.ZkSynclite) {
    return true
  }
  return false
}

const isArbNova = function (makerTx: MakerTx) {
  if (makerTx.toChain && makerTx.toChain === Chains.ArbNova) {
    return true
  }
  return false
}

const isBSC = function (makerTx: MakerTx) {
  if (makerTx.toChain && makerTx.toChain === Chains.BSC) {
    return true
  }
  return false
}

const isPolygon = function (makerTx: MakerTx) {
  if (makerTx.toChain && makerTx.toChain === Chains.Polygon) {
    return true
  }
  return false
}

const isWETHChain = (makerTx: MakerTx) => {
  return isPolygon(makerTx) || isBSC(makerTx)
}

export { isStarknet, isZkSyncera, isZksynclite, isBSC, isPolygon, isArbNova, isWETHChain }
