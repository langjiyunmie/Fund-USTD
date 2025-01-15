const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("部署合约的账户:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("账户余额:", ethers.formatEther(balance));

    try {
        // 1. 部署 USDT Mock（仅在本地测试网络）
        console.log("\n开始部署 USDT Mock...");
        const USDTMock = await ethers.getContractFactory("USDTMock");
        const usdt = await USDTMock.deploy();
        await usdt.waitForDeployment();

        const usdtAddress = await usdt.getAddress();
        console.log("USDT Mock 已部署到:", usdtAddress);

        // 2. 设置众筹参数
        const targetAmount = ethers.parseUnits("5000", 18);
        const duration = 7 * 24 * 60 * 60;
        const endTime = Math.floor(Date.now() / 1000) + duration;

        // 3. 部署 Fund 合约
        console.log("\n开始部署 Fund 合约...");
        const Fund = await ethers.getContractFactory("Fund");
        const fund = await Fund.deploy(usdtAddress, targetAmount, endTime);
        await fund.waitForDeployment();

        const fundAddress = await fund.getAddress();
        console.log("Fund 合约已部署到:", fundAddress);

        // 4. 如果是本地网络，给测试账户分发 USDT
        if (network.name === "localhost" || network.name === "hardhat") {
            console.log("\n开始分发 USDT 到测试账户...");
            const signers = await ethers.getSigners();
            const testSigners = signers.slice(1, 9);
            const amount = ethers.parseUnits("1000", 18);

            for (let i = 0; i < testSigners.length; i++) {
                await usdt.mint(testSigners[i].address, amount);
                console.log(`已分发 1000 USDT 到账户 ${i + 1}:`, testSigners[i].address);
            }
        }

        // 5. 打印部署信息
        console.log("\n部署信息汇总:");
        console.log("------------------");
        console.log("USDT 地址:", usdtAddress);
        console.log("Fund 地址:", fundAddress);
        console.log("目标金额:", ethers.formatUnits(targetAmount, 18), "USDT");
        console.log("结束时间:", new Date(endTime * 1000).toLocaleString());
        console.log("------------------");

    } catch (error) {
        console.error("\n部署过程中出现错误:");
        console.error(error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });