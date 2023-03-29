const api = 'https://nova-explorer.arbitrum.io'
const path = '/address/0xFf600Eb9d9B6d72e744564ED2e13929B746Fa626?type=JSON'
const axios = require('axios')
const cheerio = require('cheerio');
const constant = require('../constant/index')
const ethers = require('ethers');
function getPath (address) {
    return `/address/${address}?type=JSON`
}
const genDataFromHtml  = function (html) {
    let data = {}
    let $ = cheerio.load(html);
    let span = $('span')
    const length = span.length
    for (let i = 0; i < length; i++) {
        if (span[i].attribs['data-address-hash']) {
            if (!data.from) {
                data.from = span[i].attribs['data-address-hash']
            } else {
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
        data.amount = ethers.parseUnits(data.amount, constant.decimalMap[data.symbol]).toString()
    }
    return data;
}

async function scanNova (address, maxCount = 200) {
    let list = [];
    let done = false;
    let url = `${api}${getPath(address)}`;
    while (!done) {
        const r = await axios.get(url)
        const items = r.data.items
        list = list.concat(items);
        if (list.length >= maxCount || !r.data.next_page_path) {
            done = true
        } else {
            url = `${api}${r.data.next_page_path}&type=JSON`
        }
    }
    const dataList = list.map(e => genDataFromHtml(e))
    console.log(dataList)
    return dataList
}
// scanNova('0xFf600Eb9d9B6d72e744564ED2e13929B746Fa626')
module.exports.scanNova = scanNova