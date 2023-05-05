import { Chains } from '../config/chains'
import { SCAN_URLS, SCAN_APIKEYS } from '../config/scan'

export function getScanUrlAndAPIKey(chain: Chains): { url: string | undefined; key: string | undefined } {
  const url: string | undefined = SCAN_URLS[chain]
  const key: string | undefined = SCAN_APIKEYS[chain]

  return { url, key }
}

export function getScanTxListURL(
  chain: Chains,
  address: string,
  { endblock = '999999999', offset = 300 }
): string | undefined {
  const { url, key } = getScanUrlAndAPIKey(chain)

  if (!url || !key) {
    return undefined
  }

  return `${url}?module=account&action=txlist&address=${address}&startblock=0&endblock=${endblock}&page=1&offset=${offset}&sort=desc&apikey=${key}`
}

export function getScanTxStatusByHashUrl(chain: Chains, hash: string) {
  const { url, key } = getScanUrlAndAPIKey(chain)
  if (!url || !key) {
    return undefined
  }
  return `${url}?module=transaction&action=getstatus&txhash=${hash}&apikey=${key}`
}

export function getTokenTxListURL(
  chain: Chains,
  userAddress: string,
  tokenAddress: string,
  { endblock = '999999999', offset = 300 }
): string | undefined {
  const { url, key } = getScanUrlAndAPIKey(chain)

  if (!url || !key) {
    return undefined
  }
  
  return `${url}?module=account&action=tokentx&contractaddress=${tokenAddress}&address=${userAddress}&page=1&offset=${offset}&startblock=0&endblock=${endblock}&sort=desc&apikey=${key}`
}