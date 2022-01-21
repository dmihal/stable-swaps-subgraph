import { BigInt } from "@graphprotocol/graph-ts"
import { PoolCreated } from "../generated/UniswapV3Factory/UniswapV3Factory"
import { UniswapV3Pool as UniswapV3PoolContract, Swap } from "../generated/UniswapV3Factory/UniswapV3Pool"
import { UniswapV3Pool } from "../generated/templates"
import { Protocol, Pool, Asset } from "../generated/schema"
import { ensureAsset, assetTypes } from "./asset"
import { toDecimal } from "./utils"

export function handlePoolCreated(event: PoolCreated): void {
  if (assetTypes.has(event.params.token0.toHex()) && assetTypes.has(event.params.token1.toHex())) {
    UniswapV3Pool.create(event.params.pool)

    let pool = new Pool(event.params.pool.toHex())

    pool.totalVolume = BigInt.fromI32(0).toBigDecimal()
    pool.protocol = 'uniswap-v3'
    pool.assets = [event.params.token0, event.params.token1]

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
  let token0 = Asset.load(pool.assets[0].toHex())!
  let token1 = Asset.load(pool.assets[1].toHex())!
  let protocol = Protocol.load(pool.protocol)!

  let zeroForOne = event.params.amount0 > event.params.amount1
  let volumeWei = zeroForOne ? event.params.amount0 : event.params.amount1
  let volumeDecimal = toDecimal(volumeWei, zeroForOne ? token0.decimals : token1.decimals)

  pool.totalVolume += volumeDecimal
  token0.totalVolume += volumeDecimal
  token1.totalVolume += volumeDecimal
  protocol.totalVolume += volumeDecimal

  pool.save()
  token0.save()
  token1.save()
  protocol.save()
}
