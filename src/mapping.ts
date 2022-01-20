import { Address, BigInt } from "@graphprotocol/graph-ts"
import { PoolCreated } from "../generated/UniswapV3Factory/UniswapV3Factory"
import { UniswapV3Pool as UniswapV3PoolContract, Swap } from "../generated/UniswapV3Factory/UniswapV3Pool"
import { ERC20 } from "../generated/UniswapV3Factory/ERC20"
import { UniswapV3Pool } from "../generated/templates"
import { Protocol, Pool, Asset } from "../generated/schema"

let stablecoins = new Map<string, bool>()
stablecoins.set("0x6b175474e89094c44da98b954eedeac495271d0f", true) // Dai
stablecoins.set("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", true) // USDC
stablecoins.set("0xdac17f958d2ee523a2206206994597c13d831ec7", true) // USDT
stablecoins.set("0x5f98805A4E8be255a32880FDeC7F6728C6568bA0", true) // LUSD
stablecoins.set("0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3", true) // MIM
stablecoins.set("0xa47c8bf37f92abed4a126bda807a7b7498661acd", true) // UST

function ensureAsset(address: Address): void {
  let asset = Asset.load(address.toHex())

  if (!asset) {
    let contract = ERC20.bind(address)

    asset = new Asset(address.toHex())
    asset.decimals = contract.decimals()
    asset.totalVolume = BigInt.fromI32(0).toBigDecimal()
    asset.save()
  }
}

export function handlePoolCreated(event: PoolCreated): void {
  if (stablecoins.has(event.params.token0.toHex()) && stablecoins.has(event.params.token1.toHex())) {
    UniswapV3Pool.create(event.params.pool)

    let pool = new Pool(event.params.pool.toHex())

    pool.totalVolume = BigInt.fromI32(0).toBigDecimal()
    pool.protocol = 'uniswap-v3'
    pool.asset0 = event.params.token0
    pool.asset1 = event.params.token1

    ensureAsset(event.params.token0)
    ensureAsset(event.params.token1)

    let protocol = Protocol.load('uniswap-v3')
    if (!protocol) {
      protocol = new Protocol('uniswap-v3')
      protocol.totalVolume = BigInt.fromI32(0).toBigDecimal()
      protocol.save()
    }

    pool.save()
  }
}

export function handleSwap(event: Swap): void {
  let pool = Pool.load(event.address.toHex())!
  let token0 = Asset.load(pool.asset0.toHex())!
  let token1 = Asset.load(pool.asset1.toHex())!
  let protocol = Protocol.load(pool.protocol)!

  let zeroForOne = event.params.amount0 > event.params.amount1
  let volumeWei = zeroForOne ? event.params.amount0 : event.params.amount1
  let volumeDecimal = volumeWei.divDecimal(BigInt.fromI32(10).pow((zeroForOne ? token0.decimals : token1.decimals) as u8).toBigDecimal())

  pool.totalVolume += volumeDecimal
  token0.totalVolume += volumeDecimal
  token1.totalVolume += volumeDecimal
  protocol.totalVolume += volumeDecimal

  pool.save()
  token0.save()
  token1.save()
  protocol.save()
}
