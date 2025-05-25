// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "hardhat/console.sol";

contract GNaira is ERC20, Ownable, AccessControl {
    // 1 billion G-Naira initial supply (with 18 decimals)
    uint256 public constant INITIAL_SUPPLY = 1000000000 * 10**18;

    bytes32 public constant GOVERNOR = keccak256("GOVERNOR_ROLE");

    // hash table/dictionary to store and check blacklisted address
    mapping(address => bool) private _blacklist;

    // Custom governor approval events aside grantRole/revokeRole which is already emitted by openzeppelin
    event GovernorMintApproved(
        address indexed governor, 
        address indexed to, 
        uint256 amount
    );

    event GovernorBurnApproved(
        address indexed governor,
        address indexed from,
        uint256 amount
    );

    event GovernorBlacklistSet(
        address indexed governor, 
        address indexed account, 
        bool blacklisted
    );

    constructor () ERC20('G-Naira', 'gNGN') Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR, msg.sender);
    }

    function grantRole(bytes32 role, address account) public virtual override onlyRole(getRoleAdmin(role)) {
        require(!_blacklist[account], "Can not grant GOVERNOR role to blacklisted account");
        super.grantRole(role, account);
    }

    // Add an address/account to blacklist
    function blacklistAddress(address account) external onlyRole(GOVERNOR) {
        _blacklist[account] = true;
        emit GovernorBlacklistSet(msg.sender, account, true);
    }

    // Remove an address/account to blacklist
    function unblacklistAddress(address account) external onlyRole(GOVERNOR) {
        _blacklist[account] = false;
        emit GovernorBlacklistSet(msg.sender, account, false);
    }

    // Check if an address/account is blacklisted
    function isBlacklisted(address account) public view returns(bool) {
        return _blacklist[account];
    }

    // Minting of new token currency 
    function mint(address to, uint256 amount) external onlyRole(GOVERNOR) {
        require(!_blacklist[to], "Recipient is blacklisted");
        _mint(to, amount);
        emit GovernorMintApproved(msg.sender, to, amount);
    }

    // Burning of token currency
    function burn(address from, uint256 amount) external onlyRole(GOVERNOR) {
        _burn(from, amount);
        emit GovernorBurnApproved(msg.sender, from, amount);
    }

    // Function for token transfer restricted blacklisted address
    function _update(address from, address to, uint256 amount) internal override {
        // if it's not a mint or burn (from | to == address(0)), require both address are not blacklisted
        if (from != address(0) && to != address(0)) {
            // checking if both address are blacklisted
            require(!_blacklist[from], "Sender is blacklisted");
            require(!_blacklist[to], "Recipient is blacklisted");
        }

        // calling the parent hook after checking if the addresses are blacklisted
        super._update(from, to, amount);
    }
}
