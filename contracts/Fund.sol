// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Fund {
    address public owner;
    mapping(address => uint256) public funders;
    address[] public funderAddresses;
    uint256 public totalAmount;
    uint256 public targetAmount;
    bool public isFunding = true;
    uint256 public timeEnd;
    IERC20 public usdt;

    event Funder(address indexed funder);

    constructor(address _usdt, uint256 _targetAmount, uint256 _timeEnd) {
        owner = msg.sender;
        usdt = IERC20(_usdt);
        targetAmount = _targetAmount;
        timeEnd = _timeEnd;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function fund(uint256 amount) public {
        require(isFunding, "funding is not started");
        require(block.timestamp <= timeEnd, "funding is ended");

        require(usdt.transferFrom(msg.sender, address(this), amount), "USDT transfer failed");

        funders[msg.sender] += amount;
        totalAmount += amount;
        
        if (funders[msg.sender] == amount) {
            funderAddresses.push(msg.sender);
        }
        
        emit Funder(msg.sender);
    }

    function refund() public {
        require(block.timestamp > timeEnd, "funding is not ended");
        require(totalAmount < targetAmount, "target amount is reached");
        
        for (uint256 i = 0; i < funderAddresses.length; i++) {
            address funder = funderAddresses[i];
            uint256 amount = funders[funder];
            if (amount > 0) {
                funders[funder] = 0;
                require(usdt.transfer(funder, amount), "USDT refund failed");
            }
        }
        
        delete funderAddresses;
    }

    function withdraw() public onlyOwner {
        require(block.timestamp > timeEnd, "funding is not ended");
        require(totalAmount >= targetAmount, "target amount is not reached");
        
        uint256 balance = usdt.balanceOf(address(this));
        require(usdt.transfer(owner, balance), "USDT withdrawal failed");
    }
} 