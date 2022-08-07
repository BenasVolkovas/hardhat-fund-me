export interface networkConfigItem {
    ethUsdPriceFeed?: string
    blockConfirmations?: number
}

export interface networkConfigInfo {
    [key: string]: networkConfigItem
}

export const MOCK_DECIMALS = "18"
export const MOCK_INITIAL_PRICE = "2000000000000000000000" // 2000

export const networkConfig: networkConfigInfo = {
    localhost: {},
    hardhat: {},
    kovan: {
        ethUsdPriceFeed: "0x9326BFA02ADD2366b30bacB125260Af641031331",
        blockConfirmations: 6,
    },
}

export const developmentChains = ["hardhat", "localhost"]
