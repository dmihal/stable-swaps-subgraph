import { Address, BigInt } from "@graphprotocol/graph-ts"
import { ERC20 } from "../generated/UniswapV3Factory/ERC20"
import { Asset, ProtocolAsset, AssetPrice } from "../generated/schema"

export let ETH = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
export let WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
export let WBTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
export let EURS = '0xdb25f211ab05b1c97d595516f45794528a807ad8'
export let USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

export let assetTypes = new Map<string, string>()
assetTypes.set("0x6b175474e89094c44da98b954eedeac495271d0f", 'usd') // Dai
assetTypes.set(USDC, 'usd') // USDC
assetTypes.set("0xdac17f958d2ee523a2206206994597c13d831ec7", 'usd') // USDT
assetTypes.set("0x5f98805A4E8be255a32880FDeC7F6728C6568bA0", 'usd') // LUSD
assetTypes.set("0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3", 'usd') // MIM
assetTypes.set("0xa47c8bf37f92abed4a126bda807a7b7498661acd", 'usd') // UST
assetTypes.set("0x853d955acef822db058eb8505911ed77f175b99e", 'ust') // FRAX

assetTypes.set(ETH, 'eth')
assetTypes.set(WETH, 'eth') // WETH
assetTypes.set("0xae7ab96520de3a18e5e111b5eaab095312d7fe84", 'eth') // Lido stETH
assetTypes.set("0x5e74c9036fb86bd7ecdcb084a0673efc32ea31cb", 'eth') // sETH
assetTypes.set("0x0100546f2cd4c9d97f798ffc9755e47865ff7ee6", 'eth') // alETH

assetTypes.set("0xd71ecff9342a5ced620049e616c5035f1db98620", 'eur') // sEUR
assetTypes.set(EURS, 'eur') // EURS
assetTypes.set("0xc581b735a1688071a1746c968e0798d642ede491", 'eur') // EURT

assetTypes.set(WBTC, 'btc') // WBTC
assetTypes.set("0xfe18be6b3bd88a2d2a7f928d00292e7a9963cfc6", 'btc') // sBTC 
assetTypes.set("0x8daebade922df735c38c80c7ebd708af50815faa", 'btc') // tBTC

export function getMatchingAssets(assets: Address[]): string | null {
  let assetType: string | null = null
  for (let i = 0; i < assets.length; i += 1) {
    if (!assetTypes.has(assets[i].toHex())) {
      return null
    }
    let type = assetTypes.get(assets[i].toHex())
    if (assetType == null) {
      assetType = type
    } else if (assetType != type) {
      return null
    }
  }
  return assetType
}

export function ensureAsset(address: Address, protocol: string): void {
  let asset = Asset.load(address.toHex())

  if (!asset) {
    let contract = ERC20.bind(address)

    asset = new Asset(address.toHex())
    asset.decimals = address.toHex() == ETH ? 18 : contract.decimals()
    asset.totalVolume = BigInt.fromI32(0).toBigDecimal()
    asset.totalVolumeUSD = BigInt.fromI32(0).toBigDecimal()
    asset.assetType = assetTypes.get(address.toHex())
    asset.save()
  }

  let price = AssetPrice.load(asset.assetType)
  if (!price) {
    price = new AssetPrice(asset.assetType)
    price.price = BigInt.fromI32(1).toBigDecimal()
    price.save()
  }

  let protocolAsset = ProtocolAsset.load(protocol + '-' + asset.assetType)
  if (!protocolAsset) {
    protocolAsset = new ProtocolAsset(protocol + '-' + asset.assetType)
    protocolAsset.protocol = protocol
    protocolAsset.totalVolume = BigInt.fromI32(0).toBigDecimal()
    protocolAsset.totalVolumeUSD = BigInt.fromI32(0).toBigDecimal()
    protocolAsset.save()
  }
}

export function getPricePair(asset0: Address, asset1: Address): string | null {
  let address0 = asset0.toHex()
  let address1 = asset1.toHex()

  if ((address0 == USDC && address1 == WETH) || (address1 == USDC && address0 == WETH)) {
    return 'eth'
  }
  if ((address0 == USDC && address1 == WBTC) || (address1 == USDC && address0 == WBTC)) {
    return 'btc'
  }
  if ((address0 == USDC && address1 == EURS) || (address1 == USDC && address0 == EURS)) {
    return 'eur'
  }

  return null
}
