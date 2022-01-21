import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export function toDecimal(num: BigInt, decimals: i32): BigDecimal {
  return num.divDecimal(BigInt.fromI32(10).pow(decimals as u8).toBigDecimal())
}
