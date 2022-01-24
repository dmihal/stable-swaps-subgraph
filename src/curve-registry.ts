import { Address, dataSource, DataSourceContext, ethereum, BigInt, Bytes, log } from '@graphprotocol/graph-ts'

import { PoolAdded, CurveRegistry } from '../generated/CurveRegistry/CurveRegistry'
import { StableSwap } from '../generated/CurveRegistry/StableSwap'
import { CurvePool } from '../generated/templates'

import { Protocol, Pool } from '../generated/schema'
import { assetTypes, ensureAsset, getMatchingAssets } from './asset'

function getOrNull<T>(result: ethereum.CallResult<T>): T | null {
  return result.reverted ? null : result.value
}

export function handlePoolAdded(event: PoolAdded): void {
  let address = event.params.pool
  let pool = Pool.load(address.toHexString())

  if (pool == null) {
    let protocol = Protocol.load('curve')
    if (!protocol) {
      protocol = new Protocol('curve')
      protocol.totalVolumeUSD = BigInt.fromI32(0).toBigDecimal()
      protocol.save()
    }

    let registryContract = CurveRegistry.bind(dataSource.address())
    let poolContract = StableSwap.bind(address)

    pool = new Pool(address.toHexString())
    // pool.swapAddress = poolContract._address
    // pool.registryAddress = registryContract._address

    // Identify metapools
    let metapool = registryContract.try_is_meta(address)
    let isMeta = !metapool.reverted && metapool.value

    pool.totalVolume = BigInt.fromI32(0).toBigDecimal()
    pool.protocol = 'curve'
    pool.assets = []

    // let coins = getOrNull<Address[]>(registryContract.try_get_coins(poolContract._address))
    // let underlyingCoins = getOrNull<Address[]>(registryContract.try_get_underlying_coins(poolContract._address))
  
    let assets: Address[] = new Array<Address>(8)
    let numAssets = 0
    let underlying = true

    for (let i = 0; i < 4; i += 1) {
      let result = poolContract.try_underlying_coins(BigInt.fromI32(i))
      if (result.reverted) {
        underlying = false
        result = poolContract.try_coins(BigInt.fromI32(i))
      }
      if (result.reverted) {
        result = poolContract.try_coins1(BigInt.fromI32(i))
      }
      if (result.reverted) {
        numAssets = i
        break
      }

      assets[i] = result.value
    }

    if (numAssets == 0) {
      log.warning("Found 0 assets for pool {}", [address.toHex()])
      return
    }

    // let assets = underlyingCoins === null ? coins! : underlyingCoins

    if (!assetTypes.has(assets[0].toHex())) {
      return
    }
    let type: string | null
    if (isMeta) {
      return
      // type = assetTypes.get(assets[0].toHex())
    } else {
      type = getMatchingAssets(assets.slice(0, numAssets))
      if (type == null) {
        return
      }
    }

    let assetsBytes: Bytes[] = new Array<Bytes>(numAssets)

    for (let i = 0; i < numAssets; i += 1) {
      ensureAsset(assets[i], 'curve')
      assetsBytes[i] = assets[i]
    }
    pool.assets = assetsBytes

    pool.save()

    // Start indexing events from new pool
    let context = new DataSourceContext()
    context.setBytes('registry', registryContract._address)
    context.setBoolean('underlying', underlying)

    CurvePool.createWithContext(address, context)
  }
}
