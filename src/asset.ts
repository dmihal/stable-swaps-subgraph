import { Address, BigInt } from "@graphprotocol/graph-ts"
import { ERC20 } from "../generated/UniswapV3Factory/ERC20"
import { Asset } from "../generated/schema"

let ethAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

export let assetTypes = new Map<string, string>()
assetTypes.set("0x6b175474e89094c44da98b954eedeac495271d0f", 'usd') // Dai
assetTypes.set("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 'usd') // USDC
assetTypes.set("0xdac17f958d2ee523a2206206994597c13d831ec7", 'usd') // USDT
assetTypes.set("0x5f98805A4E8be255a32880FDeC7F6728C6568bA0", 'usd') // LUSD
assetTypes.set("0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3", 'usd') // MIM
assetTypes.set("0xa47c8bf37f92abed4a126bda807a7b7498661acd", 'usd') // UST

export function ensureAsset(address: Address): void {
  let asset = Asset.load(address.toHex())

  if (!asset) {
    let contract = ERC20.bind(address)

    asset = new Asset(address.toHex())
    asset.decimals = address.toHex() == ethAddress ? 18 : contract.decimals()
    asset.totalVolume = BigInt.fromI32(0).toBigDecimal()
    asset.save()
  }
}
