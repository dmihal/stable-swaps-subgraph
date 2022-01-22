import { BigInt, dataSource, ethereum } from '@graphprotocol/graph-ts'
import { TokenExchange, TokenExchangeUnderlying } from '../generated/templates/CurvePool/StableSwap'
import { toDecimal } from './utils'
import { Asset, Protocol, Pool } from '../generated/schema'

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

    // Save trade volume
    let volume = amountSold.plus(amountBought).div(BigInt.fromI32(2).toBigDecimal())

    pool.totalVolume += volume
    protocol.totalVolume += volume

    tokenSold.totalVolume += amountSold
    tokenBought.totalVolume += amountBought

    tokenSold.save()
    tokenBought.save()

    pool.save()
    protocol.save()
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

    // Save trade volume
    let volume = amountSold.plus(amountBought).div(BigInt.fromI32(2).toBigDecimal())

    pool.totalVolume += volume
    protocol.totalVolume += volume

    tokenSold.totalVolume += amountSold
    tokenBought.totalVolume += amountBought

    tokenSold.save()
    tokenBought.save()

    pool.save()
    protocol.save()
  }
}

function getEventId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
}
