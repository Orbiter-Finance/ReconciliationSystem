import { MakerTx } from '../constant/type'
import { Chains } from '../config/chains'

export const isChainId = function (id: any): id is Chains {
  return [...Object.values(Chains)].includes(id)
}

const isStarknet = function (makerTx: MakerTx | string) {
  if (typeof makerTx === 'string') {
    return makerTx === Chains.Starknet
  }
  if (makerTx.toChain && makerTx.toChain === Chains.Starknet) {
    return true
  }
  return false
}

const isZkSyncera = function (makerTx: MakerTx | string) {
  if (typeof makerTx === 'string') {
    return makerTx === Chains.ZkSyncera
  }
  if (makerTx.toChain && makerTx.toChain === Chains.ZkSyncera) {
    return true
  }
  return false
}

const isZksynclite = function (makerTx: MakerTx | string) {
  if (typeof makerTx === 'string') {
    return makerTx === Chains.ZkSynclite
  }
  if (makerTx.toChain && makerTx.toChain === Chains.ZkSynclite) {
    return true
  }
  return false
}

const isArbNova = function (makerTx: MakerTx | string) {
  if (typeof makerTx === 'string') {
    return makerTx === Chains.ArbNova
  }
  if (makerTx.toChain && makerTx.toChain === Chains.ArbNova) {
    return true
  }
  return false
}

const isBSC = function (makerTx: MakerTx | string) {
  if (typeof makerTx === 'string') {
    return makerTx === Chains.BSC
  }
  if (makerTx.toChain && makerTx.toChain === Chains.BSC) {
    return true
  }
  return false
}

const isPolygon = function (makerTx: MakerTx | string) {
  if (typeof makerTx === 'string') {
    return makerTx === Chains.Polygon
  }
  if (makerTx.toChain && makerTx.toChain === Chains.Polygon) {
    return true
  }
  return false
}

const isWETHChain = (makerTx: MakerTx | string) => {
  return isPolygon(makerTx) || isBSC(makerTx)
}

export { isStarknet, isZkSyncera, isZksynclite, isBSC, isPolygon, isArbNova, isWETHChain }
