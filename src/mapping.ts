import { BigInt } from "@graphprotocol/graph-ts"
import { PoolCreated } from "../generated/UniswapV3Factory/UniswapV3Factory"
import { UniswapV3Pool as UniswapV3PoolContract, Swap } from "../generated/UniswapV3Factory/UniswapV3Pool"
import { UniswapV3Pool } from "../generated/templates"
import { Protocol, Pool, Asset, ProtocolAsset } from "../generated/schema"
import { ensureAsset, getMatchingAssets } from "./asset"
import { toDecimal } from "./utils"

export function handlePoolCreated(event: PoolCreated): void {
  let type = getMatchingAssets([event.params.token0, event.params.token1])
  if (type != null) {
    UniswapV3Pool.create(event.params.pool)

    let pool = new Pool(event.params.pool.toHex())

    pool.totalVolume = BigInt.fromI32(0).toBigDecimal()
    pool.protocol = 'uniswap-v3'
    pool.assets = [event.params.token0, event.params.token1]
    pool.assetType = type!

    ensureAsset(event.params.token0, 'uniswap-v3')
    ensureAsset(event.params.token1, 'uniswap-v3')

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
  let protocolAsset = ProtocolAsset.load(pool.protocol + '-' + token0.assetType)!

  let zeroForOne = event.params.amount0 > event.params.amount1
  let volumeWei = zeroForOne ? event.params.amount0 : event.params.amount1
  let volumeDecimal = toDecimal(volumeWei, zeroForOne ? token0.decimals : token1.decimals)

  pool.totalVolume += volumeDecimal
  token0.totalVolume += volumeDecimal
  token1.totalVolume += volumeDecimal
  protocol.totalVolume += volumeDecimal
  protocolAsset.totalVolume += volumeDecimal

  pool.save()
  token0.save()
  token1.save()
  protocol.save()
  protocolAsset.save()
}
