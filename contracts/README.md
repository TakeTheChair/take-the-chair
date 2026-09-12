# Contracts

Two contracts, no owner, no pause, no upgrades.

- `src/Press.sol`: receives $CHAIR fees in SPY, holds the Chair, runs BRRR, holds bought stock, pays claims against Merkle roots posted by the tally key.
- `src/TakeoverDesk.sol`: the only way to take the Chair. Buys $CHAIR for the caller through a route, then seats them.

`ISwapper` (SPY to stock) and `IBuyRoute` (SPY to $CHAIR) are the two venue adapters. They are the pieces that need real Robinhood Chain addresses and interfaces before deployment: the Pons bonding curve before graduation, Uniswap v4 after.

## Rules enforced in code
| Rule | Where |
|---|---|
| 5 minutes minimum between prints, and from launch | `Press.MIN_GAP` |
| Roots wait 5 minutes before claims | `Press.ROOT_DELAY` |
| Takeover starts at 110%, decays to the minimum over 2 hours | `Press.takeoverPrice` |
| Chair must keep holding their stake | `Press.chairHoldsStake`, `removeChair`, checked in `brrr` |
| Only listed stock tokens can be picked | `Press.feedOf` |
| Swap must land within 1% of Chainlink | `Press.brrr` |
| Stale feed blocks BRRR | `Press.MAX_STALE` |
| 2% salary, 0.1% tip | `Press.SALARY_BPS`, `TIP_BPS` |
| Tally key can only post roots and hand itself over | `postRoot`, `transferTallyKey` |
| Claims can never exceed what was bought for holders | `Press.claim` (`OverCap`) |

## Run the tests
Install Foundry (getfoundry.sh), then:

```
cd contracts
npm install
forge install foundry-rs/forge-std --no-git
forge test
```

23 tests cover the security checklist in `SPEC.md`.

## Not done yet
- Real `ISwapper` and `IBuyRoute` implementations for Robinhood Chain.
- Deploy script and verified addresses.
- Testnet run.
