import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { network, deployments, ethers } from "hardhat"
import { developmentChains } from "../helper-hardhat-config"
import { FundMe, MockV3Aggregator } from "../typechain-types"

describe("FundMe", () => {
    let fundMe: FundMe
    let mockV3Aggregator: MockV3Aggregator
    let accounts: SignerWithAddress[]
    let deployer: SignerWithAddress
    const ethValue = ethers.utils.parseEther("1")

    beforeEach(async () => {
        if (!developmentChains.includes(network.name)) {
            throw "You need to be on a development chain to run tests"
        } else {
            accounts = await ethers.getSigners()
            deployer = accounts[0]
            // Deploy everything in deploy folder
            await deployments.fixture(["all"])

            fundMe = await ethers.getContract("FundMe", deployer)
            mockV3Aggregator = await ethers.getContract(
                "MockV3Aggregator",
                deployer
            )
        }
    })

    describe("constructor", () => {
        it("sets the aggregator addresses correctly", async () => {
            const response = await fundMe.getPriceFeed()
            assert.equal(response, mockV3Aggregator.address)
        })
    })

    describe("fund", () => {
        it("Fails if you don't send enough ETH", async () => {
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to spend more ETH!"
            )
        })

        it("Updates the amount funded data structure", async () => {
            await fundMe.fund({ value: ethValue })
            const response = await fundMe.getAddressToAmountFunded(
                deployer.address
            )
            assert.equal(response.toString(), ethValue.toString())
        })

        it("Adds funder to array of funders", async () => {
            await fundMe.fund({ value: ethValue })
            const response = await fundMe.getFunder(0)
            assert.equal(response, deployer.address)
        })
    })
    describe("withdraw", () => {
        beforeEach(async () => {
            await fundMe.fund({ value: ethValue })
        })

        it("gives a single funder all their ETH back", async () => {
            // Arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer.address
            )

            // Act
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait()
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer.address
            )

            // Assert
            assert.equal(endingFundMeBalance.toString(), "0")
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            )
        })

        // this test is overloaded. Ideally we'd split it into multiple tests
        // but for simplicity we left it as one
        it("is allows us to withdraw with multiple funders", async () => {
            // Arrange
            const accounts = await ethers.getSigners()
            await fundMe.connect(accounts[1]).fund({ value: ethValue })
            await fundMe.connect(accounts[2]).fund({ value: ethValue })
            await fundMe.connect(accounts[3]).fund({ value: ethValue })
            await fundMe.connect(accounts[4]).fund({ value: ethValue })
            await fundMe.connect(accounts[5]).fund({ value: ethValue })
            // Act
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer.address
            )
            const transactionResponse = await fundMe.cheaperWithdraw()
            // Let's comapre gas costs :)
            // const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait()
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer.address
            )
            // Assert
            assert.equal(endingFundMeBalance.toString(), "0")
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(withdrawGasCost).toString()
            )
            await expect(fundMe.getFunder(0)).to.be.reverted
            assert.equal(
                (
                    await fundMe.getAddressToAmountFunded(accounts[1].address)
                ).toString(),
                "0"
            )
            assert.equal(
                (
                    await fundMe.getAddressToAmountFunded(accounts[2].address)
                ).toString(),
                "0"
            )
            assert.equal(
                (
                    await fundMe.getAddressToAmountFunded(accounts[3].address)
                ).toString(),
                "0"
            )
            assert.equal(
                (
                    await fundMe.getAddressToAmountFunded(accounts[4].address)
                ).toString(),
                "0"
            )
            assert.equal(
                (
                    await fundMe.getAddressToAmountFunded(accounts[5].address)
                ).toString(),
                "0"
            )
        })
        it("Only allows the owner to withdraw", async () => {
            const attacker = accounts[1]
            await expect(
                fundMe.connect(attacker).withdraw()
            ).to.be.revertedWith("FundMe__NotOwner()")
        })
    })
})
