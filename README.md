<p align="center">
  <img src="./g-naira.png" alt="G-Naira Token Logo" width="300"/>
</p>

# GNaira Token (gNGN)

**Verified Contract Address:** 0x4215b1AccC0cEb03B8EED6C07839Fa3D0B32235c

**Etherscan (Sepolia) Link:** [https://sepolia.etherscan.io/address/0x4215b1AccC0cEb03B8EED6C07839Fa3D0B32235c#code](https://sepolia.etherscan.io/address/0x4215b1AccC0cEb03B8EED6C07839Fa3D0B32235c#code)

---

## Description

G-Naira (gNGN) is a digital version of the national currency built on the blockchain. It makes all transactions clear and easy to track, and lets designated governors control minting, burning, and blacklisting.

<p align=\"center\" style=\"max-width: 100%;\">  
  <img src=\"https://i.ibb.co/7xFBYKLz/Screenshot-2025-05-26-at-14-35-26.png\" alt=\"G-Naira Live App Screenshot\" style=\"width: 100%; height: auto;\"/>  
</p>

---

## Overview

`GNaira` is an ERC-20 token on the Sepolia testnet featuring:

* **Role-based access control** via OpenZeppelin's `AccessControl`.

  * `DEFAULT_ADMIN_ROLE`: super-admin privileges
  * `GOVERNOR_ROLE`: can mint, burn, and manage blacklists
* **Blacklist functionality** to block transfers involving flagged addresses.
* **Custom governance events** for transparency:

  * `GovernorMintApproved`
  * `GovernorBurnApproved`
  * `GovernorBlacklistSet`

<p align=\"center\">  
  <img src=\"https://i.ibb.co/LzYp3D1T/Screenshot-2025-05-26-at-15-05-36.png\" alt=\"Governor Actions - Role Management\" style=\"width: 100%; height: auto;\">  
  <img src=\"https://i.ibb.co/kV1R0H3d/Screenshot-2025-05-26-at-15-06-09.png\" alt=\"Admin Actions - Role Assignment\" style=\"width: 100%; height: auto;\">  
</p>

---

## Contract Details

* **Compiler Version:** Solidity ^0.8.28
* **OpenZeppelin Contracts:** v5.3.0
* **Initial Supply:** 1,000,000,000 gNGN minted to deployer

### Key Functions

| Function                                     | Access            | Description                                                |
| -------------------------------------------- | ----------------- | ---------------------------------------------------------- |
| `grantRole(bytes32 role, address account)`   | admin of `role`   | Grants a role (prevents granting GOVERNOR to blacklisted). |
| `blacklistAddress(address account)`          | governor          | Blacklists an address (blocks future transfers).           |
| `unblacklistAddress(address account)`        | governor          | Removes an address from blacklist.                         |
| `mint(address to, uint256 amount)`           | governor          | Mints new gNGN to `to`.                                    |
| `burn(address from, uint256 amount)`         | governor          | Burns `amount` from `from`.                                |
| `_update(address from, address to, uint256)` | internal override | Prevents transfers involving blacklisted addresses.        |
| `isBlacklisted(address account)`             | public view       | Checks if an address is blacklisted.                       |

<p align=\"center\">  
  <img src=\"https://i.ibb.co/Z1NGn2kj/Screenshot-2025-05-26-at-15-00-40.png\" alt=\"Transactions Executed Screenshot\" width=\"600\"/>  
</p>

---

## Usage Example

```js
const GNaira = await ethers.getContractAt(
  "GNaira", 
  "0x4215b1AccC0cEb03B8EED6C07839Fa3D0B32235c"
);

// Check balance
const balance = await GNaira.balanceOf(yourAddress);

// Grant GOVERNOR role
const GOVERNOR = await GNaira.GOVERNOR();
await GNaira.grantRole(GOVERNOR, testerAddress);

// Mint tokens as governor
await GNaira.mint(testerAddress, ethers.parseUnits("100", 18));

// Blacklist an address
await GNaira.blacklistAddress(badActorAddress);
```