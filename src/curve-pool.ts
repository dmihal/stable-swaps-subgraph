import { BigInt, dataSource, ethereum } from '@graphprotocol/graph-ts'
import { TokenExchange, TokenExchangeUnderlying } from '../generated/templates/CurvePool/StableSwap'
import { toDecimal } from './utils'
import { Asset, Protocol, Pool, ProtocolAsset, AssetPrice } from '../generated/schema'

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
    let assetPrice = AssetPrice.load(tokenSold.assetType)!

    // Save trade volume
    let volume = amountSold.plus(amountBought).div(BigInt.fromI32(2).toBigDecimal())
    let volumeUSD = volume * assetPrice.price

    pool.totalVolume += volume
    pool.totalVolumeUSD += volumeUSD
    protocol.totalVolumeUSD += volumeUSD
    protocolAsset.totalVolume += volume
    protocolAsset.totalVolumeUSD += volumeUSD

    tokenSold.totalVolume += amountSold
    tokenSold.totalVolumeUSD += volumeUSD
    tokenBought.totalVolume += amountBought
    tokenBought.totalVolumeUSD += volumeUSD

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
    let assetPrice = AssetPrice.load(tokenSold.assetType)!

    // Save trade volume
    let volume = amountSold.plus(amountBought).div(BigInt.fromI32(2).toBigDecimal())
    let volumeUSD = volume * assetPrice.price

    pool.totalVolume += volume
    pool.totalVolumeUSD += volumeUSD
    protocol.totalVolumeUSD += volumeUSD
    protocolAsset.totalVolume += volume
    protocolAsset.totalVolumeUSD += volumeUSD

    tokenSold.totalVolume += amountSold
    tokenSold.totalVolumeUSD += volumeUSD
    tokenBought.totalVolume += amountBought
    tokenBought.totalVolumeUSD += volumeUSD

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

// function getPoolSnapshot(pool: Pool, event: ethereum.Event): Pool {
//   if (pool != null) {
//     let poolAddress = pool.swapAddress as Address
//     let poolContract = StableSwap.bind(poolAddress)

//     // Workaround needed because batch_set_pool_asset_type() doesn't emit events
//     // See https://etherscan.io/tx/0xf8e8d67ec16657ecc707614f733979d105e0b814aa698154c153ba9b44bf779b
//     if (event.block.number.toI32() >= 12667823) {
//       // Reference asset
//       if (pool.assetType == null) {
//         let context = dataSource.context()

//         let registryAddress = context.getBytes('registry') as Address
//         let registryContract = CurveRegistry.bind(registryAddress)

//         let assetType = registryContract.try_get_pool_asset_type(poolAddress)

//         if (!assetType.reverted) {
//           let type = assetType.value.toI32()

//           if (type == 0) {
//             pool.assetType = 'USD'
//           } else if (type == 1) {
//             pool.assetType = 'ETH'
//           } else if (type == 2) {
//             pool.assetType = 'BTC'
//           } else if (type == 3) {
//             if (pool.name == 'link') {
//               pool.assetType = 'LINK'
//             } else if (pool.name.startsWith('eur')) {
//               pool.assetType = 'EUR'
//             } else {
//               pool.assetType = 'OTHER'
//             }
//           } else if (type == 4) {
//             pool.assetType = 'CRYPTO'
//           }
//         }
//       }
//     }

//     // Update coin balances and underlying coin balances/rates
//     saveCoins(pool!, event)

//     // Save current virtual price
//     let virtualPrice = poolContract.try_get_virtual_price()

//     if (!virtualPrice.reverted) {
//       pool.virtualPrice = decimal.fromBigInt(virtualPrice.value)
//     }
//   }

//   return pool
// }
