import { BigInt, dataSource, ethereum } from '@graphprotocol/graph-ts'
import { TokenExchange, TokenExchangeUnderlying } from '../generated/templates/CurvePool/StableSwap'
import { toDecimal } from './utils'
import { Asset, Protocol, Pool, ProtocolAsset } from '../generated/schema'

export function handleTokenExchange(event: TokenExchange): void {
  let context = dataSource.context()
  if (context.getBoolean('underlying')) {
    return
  }

  let pool = Pool.load(event.address.toHexString())

  if (pool != null) {
    let protocol = Protocol.load(pool.protocol)!
    // pool = getPoolSnapshot(pool!, event)

    let tokenSold = Asset.load(pool.assets[event.params.sold_id.toI32()].toHex())!
    let amountSold = toDecimal(event.params.tokens_sold, tokenSold.decimals)

    let tokenBought = Asset.load(pool.assets[event.params.bought_id.toI32()].toHex())!
    let amountBought = toDecimal(event.params.tokens_bought, tokenBought.decimals)

    let protocolAsset = ProtocolAsset.load(pool.protocol + '-' + tokenSold.assetType)!

    // Save trade volume
    let volume = amountSold.plus(amountBought).div(BigInt.fromI32(2).toBigDecimal())

    pool.totalVolume += volume
    protocol.totalVolume += volume
    protocolAsset.totalVolume += volume

    tokenSold.totalVolume += amountSold
    tokenBought.totalVolume += amountBought

    tokenSold.save()
    tokenBought.save()

    pool.save()
    protocol.save()
    protocolAsset.save()
  }
}

export function handleTokenExchangeUnderlying(event: TokenExchangeUnderlying): void {
  let pool = Pool.load(event.address.toHexString())

  if (pool != null) {
    let protocol = Protocol.load(pool.protocol)!
    // pool = getPoolSnapshot(pool!, event)

    let tokenSold = Asset.load(pool.assets[event.params.sold_id.toI32()].toHex())!
    let amountSold = toDecimal(event.params.tokens_sold, tokenSold.decimals)

    let tokenBought = Asset.load(pool.assets[event.params.bought_id.toI32()].toHex())!
    let amountBought = toDecimal(event.params.tokens_bought, tokenBought.decimals)

    let protocolAsset = ProtocolAsset.load(pool.protocol + '-' + tokenSold.assetType)!

    // Save trade volume
    let volume = amountSold.plus(amountBought).div(BigInt.fromI32(2).toBigDecimal())

    pool.totalVolume += volume
    protocol.totalVolume += volume
    protocolAsset.totalVolume += volume

    tokenSold.totalVolume += amountSold
    tokenBought.totalVolume += amountBought

    tokenSold.save()
    tokenBought.save()

    pool.save()
    protocol.save()
    protocolAsset.save()
  }
}

function getEventId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
}
