import { BigInt, dataSource, DataSourceContext, log } from "@graphprotocol/graph-ts"
import { PairCreated } from "../generated/UniswapV2Factory/UniswapV2Factory"
import { Swap } from "../generated/UniswapV2Factory/UniswapV2Pool"
import { UniswapV2Pool } from "../generated/templates"
import { Protocol, Pool, Asset, ProtocolAsset, AssetPrice } from "../generated/schema"
import { assetTypes, ensureAsset, getMatchingAssets, getPricePair, USDC } from "./asset"
import { toDecimal } from "./utils"
import { ERC20 } from "../generated/UniswapV3Factory/ERC20"

export function handlePoolCreated(event: PairCreated): void {
  let type = getMatchingAssets([event.params.token0, event.params.token1])
  if (type != null) {
    UniswapV2Pool.create(event.params.pair)

    let pool = new Pool(event.params.pair.toHex())

    pool.totalVolume = BigInt.fromI32(0).toBigDecimal()
    pool.protocol = 'uniswap-v2'
    pool.assets = [event.params.token0, event.params.token1]
    pool.assetType = type!

    ensureAsset(event.params.token0, 'uniswap-v2')
    ensureAsset(event.params.token1, 'uniswap-v2')

    let protocol = Protocol.load('uniswap-v2')
    if (!protocol) {
      protocol = new Protocol('uniswap-v2')
      protocol.totalVolumeUSD = BigInt.fromI32(0).toBigDecimal()
      protocol.save()
    }

    pool.save()
  }

  type = getPricePair(event.params.token0, event.params.token1)
  if (type != null) {
    let price = AssetPrice.load(type!)
    if (!price) {
      price = new AssetPrice(type!)
      price.price = BigInt.fromI32(1).toBigDecimal()
      price.save()
    }

    let usdcIsZero = event.params.token0.toHex() == USDC
    let contract = ERC20.bind(usdcIsZero ? event.params.token1 : event.params.token0)
    let decimals = contract.decimals()

    let context = new DataSourceContext()
    context.setString('price-pair', type!)
    context.setBoolean('usdcIsZero', usdcIsZero)
    context.setI32('decimals', decimals)
    UniswapV2Pool.createWithContext(event.params.pair, context)
  }
}

export function handleSwap(event: Swap): void {
  let zeroForOne = event.params.amount1In == BigInt.fromI32(0)

  let context = dataSource.context()
  if (context.isSet('price-pair')) {
    let assetType = context.getString('price-pair')
    let usdcIsZero = context.getBoolean('usdcIsZero')
    let decimals = context.getI32('decimals')
    let amount0 = zeroForOne ? event.params.amount0In : event.params.amount0Out
    let amount1 = zeroForOne ? event.params.amount1Out : event.params.amount1In
    let usdcAmount = usdcIsZero ? toDecimal(amount0, 6) : toDecimal(amount1, 6)
    let otherAmount = usdcIsZero ? toDecimal(amount1, decimals) : toDecimal(amount0, decimals)
    if (otherAmount == BigInt.fromI32(0).toBigDecimal()) {
      return
    }
    let price = usdcAmount.div(otherAmount)

    log.error(assetType, [])
    let priceEntity = AssetPrice.load(assetType)!
    log.error(priceEntity ? 'found' : 'notFound', [])
    priceEntity.price = price
    priceEntity.save()
    return
  }

  let pool = Pool.load(event.address.toHex())!
  let token0 = Asset.load(pool.assets[0].toHex())!
  let token1 = Asset.load(pool.assets[1].toHex())!
  let assetPrice = AssetPrice.load(token0.assetType)!
  let protocol = Protocol.load(pool.protocol)!
  let protocolAsset = ProtocolAsset.load(pool.protocol + '-' + token0.assetType)!

  let volumeWei = zeroForOne ? event.params.amount0In : event.params.amount1In
  let volumeDecimal = toDecimal(volumeWei, zeroForOne ? token0.decimals : token1.decimals)
  let volumeUSD = volumeDecimal * assetPrice.price

  pool.totalVolume += volumeDecimal
  pool.totalVolumeUSD += volumeUSD
  token0.totalVolume += volumeDecimal
  token0.totalVolumeUSD += volumeUSD
  token1.totalVolume += volumeDecimal
  token1.totalVolumeUSD += volumeUSD
  protocol.totalVolumeUSD += volumeUSD
  protocolAsset.totalVolume += volumeDecimal
  protocolAsset.totalVolumeUSD += volumeUSD

  pool.save()
  token0.save()
  token1.save()
  protocol.save()
  protocolAsset.save()
}
