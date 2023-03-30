const { isEqualsAddress } = require(".");

const makers = [
  "0x646592183ff25A0c44f09896A384004778F831ED".toLowerCase(), // 阳哥手动回
  "0x80C67432656d59144cEFf962E8fAF8926599bCF8".toLowerCase(), // ETH 自动
  "0xE4eDb277e41dc89aB076a1F049f4a3EfA700bCE8".toLowerCase(), // ETH2 自动
  "0xd7Aa9ba6cAAC7b0436c91396f22ca5a7F31664fC".toLowerCase(), // USDT 自动
  "0x41d3D33156aE7c62c094AAe2995003aE63f587B3".toLowerCase(), // USDC 自动
  "0x095D2918B03b2e86D68551DCF11302121fb626c9".toLowerCase(), // DAI 自动
  "0x6e18dd81378fd5240704204bccc546f6dfad3d08c4a3a44347bd274659ff328".toLowerCase(), // Starknet 阳哥手动回
  "0x7b393627BD514d2AA4C83E9f0C468939df15ea3c29980CD8E7be3Ec847795F0".toLowerCase(), // Starknet ETH 1 自动
  "0x64A24243F2Aabae8D2148FA878276e6E6E452E3941b417f3c33b1649EA83e11".toLowerCase(), // Starknet ETH 2 自动
  "0x411c2a2A4Dc7b4d3a33424Af3eDE7E2E3b66691E22632803E37E2e0de450940".toLowerCase(), // Starknet DAI 自动
];

module.exports = function isMaker(address) {
  return makers.some((maker) => isEqualsAddress(maker, address));
};
