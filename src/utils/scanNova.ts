const api = 'https://nova-explorer.arbitrum.io'
const path = '/address/0xFf600Eb9d9B6d72e744564ED2e13929B746Fa626?type=JSON'
import axios from "axios";
import { load } from 'cheerio'
import * as constant from '../constant/index'
import {ethers} from 'ethers'
function getPath (address) {
    return `/address/${address}?type=JSON`
}
const genDataFromHtml  = function (html) {
    let data:any = {}
    let $ = load(html);
    let span = $('span')
    const length = span.length
    for (let i = 0; i < length; i++) {
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
    for (let i = 0; i< blockA.length; i++) {
        if (blockA[i].attribs['href'] && blockA[i].attribs['href'].indexOf('/block') === 0) {
            data.blockNumber = blockA[i].attribs['href'].replace('/block/', '')
        } else if (blockA[i].attribs['href'] && blockA[i].attribs['href'].indexOf('/tx') === 0) (
            data.hash = blockA[i].attribs['href'].replace('/tx/', '')
        )
    }
    const amountSpan = $('.tile-title')
    let [ amount, symbol ] = amountSpan.text().replace(/\n/g,'').split(' ')
    data.amount = amount
    data.symbol = symbol;
    if (constant.decimalMap[data.symbol]) {
        data.amount = ethers.utils.parseUnits(data.amount, constant.decimalMap[data.symbol]).toString()
    }
    const inOrOutSpan = $('.tile-badge')
    data.size = inOrOutSpan.text().trim()
    return data;
}

async function scanNova (address, maxCount = 200, onlyIn = true) {
    let dataList = [];
    let allList = [];
    let done = false;
    let url = `${api}${getPath(address)}`;
    let page = 1;
    const maxPage = 8;
    while (!done) {
        const r = await axios.get(url)
        const items = r.data.items.map(e => genDataFromHtml(e))
        // allList = allList.concat(items)
        if (onlyIn) {
            dataList = dataList.concat(items.filter(e => e.size === 'IN'))
        } else {
            dataList = dataList.concat(items)
        }

        if (dataList.length >= maxCount || !r.data.next_page_path || page >= maxPage) {
            done = true
        } else {
            url = `${api}${r.data.next_page_path}&type=JSON`
        }
        page++
    }
    return dataList
}
// scanNova('0x6652152db1aa4402f041a71bed216375a7704fb4')
export default scanNova