const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Fund Contract", function () {
    let Fund;
    let fund;
    let USDTMock;
    let usdt;
    let owner;
    let users;
    let endTime;
    
    // 测试参数
    const INITIAL_USDT = ethers.parseUnits("1000", 18); // 每个用户 1000 USDT
    const TARGET_AMOUNT = ethers.parseUnits("5000", 18); // 目标金额 5000 USDT
    const ONE_DAY = 24 * 60 * 60;

    beforeEach(async function () {
        // 获取当前区块时间戳
        const latestBlock = await ethers.provider.getBlock('latest');
        endTime = latestBlock.timestamp + ONE_DAY; // 设置结束时间为当前时间加一天
        
        // 获取测试账号
        [owner, ...users] = await ethers.getSigners();
        users = users.slice(0, 8);
        
        // 部署 USDT Mock
        USDTMock = await ethers.getContractFactory("USDTMock");
        usdt = await USDTMock.deploy();
        await usdt.waitForDeployment();

        // 部署 Fund 合约
        Fund = await ethers.getContractFactory("Fund");
        fund = await Fund.deploy(
            await usdt.getAddress(),
            TARGET_AMOUNT,
            endTime  // 使用计算好的结束时间
        );
        await fund.waitForDeployment();

        // 给每个用户分发 1000 USDT
        for (let user of users) {
            await usdt.mint(user.address, INITIAL_USDT);
        }
    });

    describe("Initial Setup", function () {
        it("Should distribute USDT correctly to all users", async function () {
            for (let user of users) {
                const balance = await usdt.balanceOf(user.address);
                expect(balance).to.equal(INITIAL_USDT);
            }
        });

        it("Should show correct total supply", async function () {
            const totalSupply = await usdt.totalSupply();
            // 初始供应量 + (1000 USDT * 8个用户)
            const expectedSupply = ethers.parseUnits("1008000", 18);
            expect(totalSupply).to.equal(expectedSupply);
        });
    });

    describe("Funding Process", function () {
        it("Should allow multiple users to fund", async function () {
            const fundAmount = ethers.parseUnits("500", 18); // 每人投资 500 USDT

            // 每个用户都进行投资
            for (let user of users) {
                // 授权
                await usdt.connect(user).approve(await fund.getAddress(), fundAmount);
                // 投资
                await fund.connect(user).fund(fundAmount);

                // 验证投资记录
                expect(await fund.funders(user.address)).to.equal(fundAmount);
            }

            // 验证总投资金额
            const totalFunded = await fund.totalAmount();
            expect(totalFunded).to.equal(fundAmount * BigInt(8)); // 500 * 8 = 4000 USDT
        });

        it("Should track funder addresses correctly", async function () {
            const fundAmount = ethers.parseUnits("100", 18);

            // 只让前 5 个用户投资
            for (let i = 0; i < 5; i++) {
                await usdt.connect(users[i]).approve(await fund.getAddress(), fundAmount);
                await fund.connect(users[i]).fund(fundAmount);
            }

            // 验证每个投资者的金额
            for (let i = 0; i < 5; i++) {
                expect(await fund.funders(users[i].address)).to.equal(fundAmount);
            }

            // 验证未投资用户的金额为 0
            for (let i = 5; i < 8; i++) {
                expect(await fund.funders(users[i].address)).to.equal(0);
            }
        });

        it("Should handle refunds correctly if target not reached", async function () {
            const fundAmount = ethers.parseUnits("100", 18);

            // 记录初始余额
            const initialBalances = await Promise.all(
                users.map(user => usdt.balanceOf(user.address))
            );

            // 所有用户投资
            for (let user of users) {
                await usdt.connect(user).approve(await fund.getAddress(), fundAmount);
                await fund.connect(user).fund(fundAmount);
            }

            // 时间快进
            await ethers.provider.send("evm_increaseTime", [ONE_DAY + 1]);
            await ethers.provider.send("evm_mine");

            // 执行退款
            await fund.refund();

            // 验证每个用户都收到了退款
            for (let i = 0; i < users.length; i++) {
                const finalBalance = await usdt.balanceOf(users[i].address);
                expect(finalBalance).to.equal(initialBalances[i]); // 应该等于初始余额
            }
        });

        it("Should allow owner to withdraw if target reached", async function () {
            const fundAmount = ethers.parseUnits("650", 18);

            // 所有用户投资（确保在时间结束前）
            for (let user of users) {
                await usdt.connect(user).approve(await fund.getAddress(), fundAmount);
                await fund.connect(user).fund(fundAmount);
            }

            // 记录owner初始余额
            const initialBalance = await usdt.balanceOf(owner.address);

            // 时间快进到结束时间之后
            await network.provider.send("evm_setNextBlockTimestamp", [endTime + 1]);
            await network.provider.send("evm_mine");

            // 提现
            await fund.withdraw();

            // 验证owner收到了所有资金
            const finalBalance = await usdt.balanceOf(owner.address);
            const expectedBalance = initialBalance + (fundAmount * BigInt(8));
            expect(finalBalance).to.equal(expectedBalance);
        });
    });
}); 