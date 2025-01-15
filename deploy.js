async function main() {
    const [deployer] = await ethers.getSigners(); // 获取部署者账户

    console.log("部署合约的账户:", deployer.address);

    const balance = await deployer.getBalance(); // 获取账户余额
    console.log("账户余额:", ethers.utils.formatEther(balance), "ETH");

    // 部署合约的代码
    const Fund = await ethers.getContractFactory("Fund");
    const fund = await Fund.deploy(/* constructor arguments */);
    await fund.deployed();

    console.log("合约部署成功:", fund.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });