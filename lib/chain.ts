// Robinhood Chain config and the contract ABIs the site reads. All addresses are real mainnet addresses.
import { defineChain, parseAbi } from "viem";

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
});

export const tokens: Record<string, { name: string; address: `0x${string}` }> = {
  SPY: { name: "SPDR S&P 500 ETF", address: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C" },
  NVDA: { name: "NVIDIA", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC" },
  TSLA: { name: "Tesla", address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d" },
  AAPL: { name: "Apple", address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9" },
  AMZN: { name: "Amazon", address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54" },
  MSFT: { name: "Microsoft", address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74" },
  GOOGL: { name: "Alphabet", address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3" },
  META: { name: "Meta", address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35" },
  MSTR: { name: "Strategy", address: "0xec262a75e413fAfD0dF80480274532C79D42da09" },
  QCOM: { name: "Qualcomm", address: "0x0f17206447090e464C277571124dD2688E48AEA9" },
};

export function tickerOf(address: string) {
  const hit = Object.entries(tokens).find(([, t]) => t.address.toLowerCase() === address.toLowerCase());
  return hit ? hit[0] : address.slice(0, 6) + "…" + address.slice(-4);
}

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

export const pressAbi = parseAbi([
  "function chair() view returns (address)",
  "function pick() view returns (address)",
  "function stakeChair() view returns (uint256)",
  "function takeoverPrice() view returns (uint256)",
  "function pressBalance() view returns (uint256)",
  "function PRINT_THRESHOLD() view returns (uint256)",
  "function MIN_TAKEOVER() view returns (uint256)",
  "function lastPrint() view returns (uint256)",
  "function printCount() view returns (uint256)",
  "function canPrint() view returns (bool)",
  "function chairHoldsStake() view returns (bool)",
  "function stocks() view returns (address[])",
  "function forHolders(address stock) view returns (uint256)",
  "function claimed(address holder, address stock) view returns (uint256)",
  "function brrr()",
  "function claim(address stock, uint256 cumulative, bytes32[] proof)",
]);

export const deskAbi = parseAbi(["function takeover(uint256 spyIn, uint256 minChairOut, address pick)"]);
