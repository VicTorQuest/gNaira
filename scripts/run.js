const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  const [deployer, user] = await ethers.getSigners();

  console.log("Deploying contracts with:");
  console.log("Deployer:", deployer.address);
  console.log("User:    ", user.address);

  const gNairaContractFactory = await ethers.getContractFactory("GNaira");
  const gNaira = await gNairaContractFactory.deploy();
  await gNaira.waitForDeployment();

  console.log(`GNaira deployed to: ${gNaira.target}`);

  let deployerBalance = await gNaira.balanceOf(deployer.address);
  console.log(deployerBalance)
  console.log(`Deployer initial balance: ${ethers.formatUnits(deployerBalance, 18)} gNGN`);

  // Grant GOVERNOR role to `user` 
  const GOVERNOR = await gNaira.GOVERNOR();
  console.log(`GOVERNOR role identifier: ${GOVERNOR}`);

  console.log("Granting GOVERNOR role to user...");
  await gNaira.grantRole(GOVERNOR, user.address);
  console.log("Role granted.");

  // Use the new governor to mint tokens to the user
  const gNairaAsUser = gNaira.connect(user);

  console.log("Minting 100 gNGN to user by governor...");
  await gNairaAsUser.mint(user.address, ethers.parseUnits("100", 18));

  let userBalance = await gNaira.balanceOf(user.address);
  console.log(`User balance after mint: ${ethers.formatUnits(userBalance, 18)} gNGN`);

  // Transfer some tokens from user to deployer
  console.log("User approves deployer to spend 50 gNGN...");
  await gNairaAsUser.approve(deployer.address, ethers.parseUnits("50", 18));
  console.log("Approval done.");

  console.log("Deployer transfers 20 gNGN from user to self via transferFrom...");
  await gNaira.transferFrom(user.address, deployer.address, ethers.parseUnits("20", 18));

  deployerBalance = await gNaira.balanceOf(deployer.address);
  userBalance = await gNaira.balanceOf(user.address);
  console.log(`Deployer balance: ${ethers.formatUnits(deployerBalance, 18)} gNGN`);
  console.log(`User balance:      ${ethers.formatUnits(userBalance, 18)} gNGN`);

  // Blacklist the user
  console.log("Blacklisting user...");
  await gNaira.blacklistAddress(user.address);
  console.log("User blacklisted.");

  // Attempt a transfer from user should now fail
  console.log("Attempting transfer from blacklisted user (should revert)...");
  try {
    await gNairaAsUser.transfer(deployer.address, ethers.utils.parseUnits("10", 18));
  } catch (err) {
    console.error("Transfer reverted as expected:", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
