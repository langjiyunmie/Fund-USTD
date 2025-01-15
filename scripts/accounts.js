async function main() {
    const signers = await ethers.getSigners();
    
    for (let i = 0; i < signers.length; i++) {
        const balance = await signers[i].getBalance();
        console.log(
            `账户 ${i}:`,
            `\n地址: ${signers[i].address}`,
            `\n余额: ${ethers.utils.formatEther(balance)} ETH\n`
        );
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 