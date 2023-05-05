import { load } from 'cheerio'
import { utils } from 'ethers'
import { NOVA_SCAN_URL } from '../../../config/scan'
import { DecimalMap } from '../../../config/tokens'
import { ArbNovaTx } from '../../../constant/tx.types'
import axios from 'axios'
import logger from '../../../utils/logger'
function getPath(address: string) {
  return `/address/${address}?type=JSON`
}

function html2ArbNovaTx(html: string) {
  const data: ArbNovaTx = {}

  const $ = load(html)
  const span = $('span')

  for (let i = 0; i < span.length; i++) {
    if (span[i].attribs['data-address-hash']) {
      // the first `data-address-hash` is from
      if (!data.from) {
        data.from = span[i].attribs['data-address-hash']
      } else {
        // the second `data-address-hash` is to
        data.to = span[i].attribs['data-address-hash']
      }
    }
    if (span[i].attribs['data-from-now']) {
      data.createdAt = span[i].attribs['data-from-now']
    }
  }

  const blockA = $('a')
  for (let i = 0; i < blockA.length; i++) {
    if (blockA[i].attribs['href'] && blockA[i].attribs['href'].indexOf('/block') === 0) {
      data.blockNumber = blockA[i].attribs['href'].replace('/block/', '')
    } else if (blockA[i].attribs['href'] && blockA[i].attribs['href'].indexOf('/tx') === 0)
      data.hash = blockA[i].attribs['href'].replace('/tx/', '')
  }

  const amountSpan = $('.tile-title')
  const [amount, symbol] = amountSpan.text().replace(/\n/g, '').split(' ')
  data.amount = amount
  data.symbol = symbol

  if (DecimalMap[data.symbol]) {
    data.amount = utils.parseUnits(data.amount, DecimalMap[data.symbol]).toString()
  }

  const inOrOutSpan = $('.tile-badge')
  data.size = inOrOutSpan.text().trim()

  return data
}

export default async function getArbNovaScanTxs(address: string, maxCount = 200, onlyIn = true) {
  let dataList: ArbNovaTx[] = []
  let done = false
  let url = `${NOVA_SCAN_URL}${getPath(address)}`
  let page = 1

  const maxPage = 8
  try {
    while (!done) {
      const res = await axios.get(url)
      const items: ArbNovaTx[] = res.data.items.map((e: string) => html2ArbNovaTx(e))

      if (onlyIn) {
        dataList = dataList.concat(items.filter((e) => e.size === 'IN'))
      } else {
        dataList = dataList.concat(items)
      }

      if (dataList.length >= maxCount || !res.data.next_page_path || page >= maxPage) {
        done = true
      } else {
        url = `${NOVA_SCAN_URL}${res.data.next_page_path}&type=JSON`
      }
      page++
    }
  } catch (error: any) {
    logger.error('getArbNovaScanTx Error:', error)
  }
  return dataList
}


export async function getArbNovaScanTxByHash(hash: string) {
  try {
    const r = await axios.get(`https://nova-explorer.arbitrum.io/tx/${hash}`)
    const html = r.data;
    let $ = load(html)
    const tx:{
      hash: string,
      blockNumber: string,
      value: string,
      symbol: string,
      fee: string,
      nonce: number
      result: string,
      status: string,
      timestamp: string,
      from: string,
      to: string
    } = {
      hash: "",
      blockNumber: "",
      value: "",
      symbol: "",
      fee: "",
      nonce: 0,
      result: "",
      status: "",
      timestamp: "",
      from: "",
      to: ""
    }
    tx.hash = $('span.transaction-details-address').text().trim()
    const spans = $('span')
    for (let i = 0; i< spans.length; i++) {
        let span = spans[i];
        if (span.attribs['class'] && span.attribs['data-transaction-status']) {
            tx.result = span.attribs['data-transaction-status']
        }
        if (!span.attribs['class'] && span.attribs['data-transaction-status']) {
            tx.status =  span.attribs['data-transaction-status']    
        }
        if (span.attribs['data-from-now']) {
            tx.timestamp = span.attribs['data-from-now']
        }
        if (span.attribs['data-address-hash']) {
            if (!tx.from) {
                tx.from = span.attribs['data-address-hash']
            } else {
                tx.to = span.attribs['data-address-hash']
            }
        }
    }
    let block = $('a.transaction__link')
    tx.blockNumber = block.text()
    const valueStr = $('div.card-body > dl:eq(7) dd').text().trim()
    const txFee = $('div.card-body > dl:eq(8) dd').text().trim()
    const nonce = $('div.card-body > dl:eq(17) dd').text().trim()
    const nonceSpan = $('div.card-body > dl:eq(17) dd > span').text().trim()

    tx.value = valueStr.split(' ')[0]
    tx.symbol = valueStr.split(' ')[1]
    tx.fee = txFee.split(' ')[0]
    tx.nonce = Number(nonce.slice(0, nonce.length - nonceSpan.length))
    return tx
  } catch (error) {
    logger.info(`getArbNovaScanTxByHash: ${hash}, error: ${error}`)
    return undefined
  }
}