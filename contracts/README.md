# Take The Chair contracts

Solidity 0.8.28, Foundry, OpenZeppelin 5. Deployed on Robinhood Chain (chain ID 4663).

```
forge install   # once
forge test      # 24 tests
```

## What's here

| File | Role |
| --- | --- |
| `src/Press.sol` | The Press. Holds SPY, tracks the Chair and their pick, runs `brrr()`, pays holders through Merkle claims with running totals. No owner, no pause, no upgrade. |
| `src/TakeoverDesk.sol` | The only address allowed to seat a Chair. `takeover(spyIn, minChairOut, pick)` buys $CHAIR with your SPY through the route and seats you. |
| `src/adapters/PonsBuyRoute.sol` | Reads the launch record from the Pons V2 factory. Buys on the bonding curve before graduation, on the graduated Uniswap v4 pool (with the Pons hook) after. |
| `src/adapters/UniswapV4Swapper.sol` | SPY to stock swap on Uniswap v4, one pool key per allowed stock, fixed at deploy. |
| `src/adapters/V4ExactInput.sol` | Shared unlock-callback exact-input swap against the PoolManager. |
| `src/interfaces/` | The slices of Pons and Uniswap v4 the contracts call. |
| `script/Deploy.s.sol` | Deploys and wires everything with the real Robinhood Chain addresses. |
| `test/` | Chair and picks, prints and price checks, Tally posting and claims, Pons escrow claiming. |

## How BRRR works, in order

1. `pullFees()` claims any SPY the Press is owed from the Pons fee escrow.
2. Checks: 5 minutes since launch and since the last print, Press holds at least the threshold.
3. Reads Chainlink for SPY and for the pick, rejects stale feeds, works out the fair amount out.
4. Swaps the SPY into the pick on Uniswap v4 and reverts if it lands more than 1% under fair.
5. Pays 2% to the Chair (if they still hold their stake), 0.1% to the caller, sets the rest aside for holders.

## Addresses used

| | Address |
| --- | --- |
| Pons V2 launch factory | `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e` |
| Uniswap v4 PoolManager | `0x8366a39cc670b4001a1121b8f6a443a643e40951` |
| SPY | `0x117cc2133c37B721F49dE2A7a74833232B3B4C0C` |
| NVDA / feed | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` / `0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15` |
| TSLA / feed | `0x322F0929c4625eD5bAd873c95208D54E1c003b2d` / `0x4A1166a659A55625345e9515b32adECea5547C38` |
| AAPL / feed | `0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9` / `0x6B22A786bAa607d76728168703a39Ea9C99f2cD0` |

Sources: docs.robinhood.com/chain, developers.uniswap.org/docs/protocols/v4/deployments, github.com/ponsdotdev/ponsfamily, docs.chain.link.

## Deploying

```
CHAIR_TOKEN=0x...  TALLY_KEY=0x...  SPY_FEED=0x... \
forge script script/Deploy.s.sol --rpc-url https://rpc.mainnet.chain.robinhood.com --broadcast --verify
```

`CHAIR_TOKEN` is the address Pons gives you at launch, `TALLY_KEY` the wallet that will post print results, and `SPY_FEED` the SPY/USD proxy from Chainlink's Robinhood Chain feed list. After deploying, call `transferCreatorFeeRecipient(CHAIR_TOKEN, press)` on the Pons factory from the launch wallet so fees flow to the Press.

Not audited.
