// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const NFTToken = await ethers.getContractFactory("NFTToken");
  console.log("Deploying NFTToken Token...");
  const nftToken = await NFTToken.deploy();
  await nftToken.deployed();

  const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
  console.log("Deploying AuctionFactory...");
  const auctionFactory = await AuctionFactory.deploy(nftToken.address);
  await auctionFactory.deployed();

  console.log("Deployed AuctionFactory address", auctionFactory.address);
  console.log("Deployed Token address", nftToken.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
