import { Chains } from './chains'

export const SCAN_URLS: {
  [chain in Chains]?: string | undefined
} = {
  [Chains.Arbitrum]: 'https://api.arbiscan.io/api',
  [Chains.Ethereum]: 'https://api.etherscan.io/api',
  [Chains.Optimism]: 'https://api-optimistic.etherscan.io/api',
  [Chains.BSC]: 'https://api.bscscan.com/api',
  [Chains.Polygon]: 'https://api.polygonscan.com/api',
  [Chains.Boba]: 'https://andromeda-explorer.metis.io/api',
  [Chains.ZkevmPolygon]: 'https://api-zkevm.polygonscan.com/api',
}

export const SCAN_APIKEYS: {
  [chain in Chains]?: string | undefined
} = {
  [Chains.Arbitrum]: '3SSTJW5DHYKUGQIC6ECFVPJZJKI31KSUR8',
  [Chains.Ethereum]: '2634DC5NYXAD6T1W65Y8M57GWX49JHM76M',
  [Chains.Optimism]: 'XMD67QU4DSRKQCCVEEZ8HYZIQF82293K7P',
  [Chains.BSC]: '211K4X2NZ82E633CKYG5UZJQHE4YVWB1RT',
  [Chains.Polygon]: 'KHBPYR3CMVA3PKRUY2EMQ5J18BXNZ3A691',
  [Chains.Boba]: 'PEZQ5P13NE7ZX8HH3YCH59IPGHEMBEKN3D',
  [Chains.ZkevmPolygon]: 'C75VEHQHI28KEIGFCW4Z1DFM3ND871352U',
}

export const NOVA_SCAN_URL = 'https://nova-explorer.arbitrum.io'

export const ZK_SYNCLITE_SCAN_URL = `https://api.zksync.io/api`
