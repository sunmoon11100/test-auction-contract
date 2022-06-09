// test/AuctionFactory.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("AuctionFactory", function () {
  let auctionFactory: Contract;
  let nft: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let auction: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const AuctionFactoryToken = await ethers.getContractFactory(
      "AuctionFactory"
    );
    const NFTToken = await ethers.getContractFactory("NFTToken");
    nft = await NFTToken.deploy();
    await nft.safeMint(await owner.getAddress());
    await nft.safeMint(await user1.getAddress());
    auctionFactory = await AuctionFactoryToken.deploy(nft.address);
    await nft.setApprovalForAll(auctionFactory.address, true);
    await nft.connect(user1).setApprovalForAll(auctionFactory.address, true);
    await auctionFactory.create(0, ethers.utils.parseEther("1"));
    auction = await auctionFactory.getAuction(1);
    await auctionFactory.connect(user1).bid(auction.auctionId, {
      value: ethers.utils.parseEther("0.5"),
    });
  });

  it("Should test create function", async function () {
    await expect(
      auctionFactory.create(1, ethers.utils.parseEther("1"))
    ).to.be.revertedWith("You have no this token.");
    await expect(auctionFactory.getAuction(0)).to.be.revertedWith(
      "Auction dose not exist."
    );
  });

  it("Should test bid function", async function () {
    await expect(
      auctionFactory.bid(0, {
        value: ethers.utils.parseEther("0.6"),
      })
    ).to.be.revertedWith("Auction dose not exist.");
    await expect(
      auctionFactory.bid(auction.auctionId, {
        value: ethers.utils.parseEther("0.6"),
      })
    ).to.be.revertedWith("You are seller.");

    expect(await ethers.provider.getBalance(auctionFactory.address)).to.equal(
      ethers.utils.parseEther("0.5")
    );
    await auctionFactory.connect(user1).bid(auction.auctionId, {
      value: ethers.utils.parseEther("0.6"),
    });
    expect(await ethers.provider.getBalance(auctionFactory.address)).to.equal(
      ethers.utils.parseEther("0.6")
    );

    await expect(
      auctionFactory.connect(user2).bid(auction.auctionId, {
        value: ethers.utils.parseEther("0.3"),
      })
    ).to.be.revertedWith("Insufficient fund");

    await auctionFactory.connect(user2).bid(auction.auctionId, {
      value: ethers.utils.parseEther("0.7"),
    });
  });

  it("Should test sell function", async function () {
    await expect(auctionFactory.sell(0)).to.be.revertedWith(
      "Auction dose not exist."
    );
    await expect(auctionFactory.connect(user1).sell(1)).to.be.revertedWith(
      "You are not a seller."
    );

    await auctionFactory.sell(1);
    expect(await nft.balanceOf(await user1.getAddress())).to.equal(2);
    expect(await ethers.provider.getBalance(auctionFactory.address)).to.equal(
      0
    );

    await auctionFactory.connect(user1).create(1, ethers.utils.parseEther("1"));
    await expect(auctionFactory.connect(user1).sell(2)).to.be.revertedWith(
      "There is no bid."
    );
  });

  it("Should test sell function", async function () {
    await expect(auctionFactory.cancel(0)).to.be.revertedWith(
      "Auction dose not exist."
    );
    await expect(auctionFactory.connect(user1).cancel(1)).to.be.revertedWith(
      "You are not a seller."
    );

    await auctionFactory.cancel(1);
    expect(await nft.balanceOf(await owner.getAddress())).to.equal(1);
    expect(await ethers.provider.getBalance(auctionFactory.address)).to.equal(
      0
    );

    await auctionFactory.connect(user1).create(1, ethers.utils.parseEther("1"));
    await auctionFactory.connect(user1).cancel(2);
    expect(await nft.balanceOf(await user1.getAddress())).to.equal(1);
  });

  it("Should test buy function", async function () {
    await expect(auctionFactory.connect(user1).buy(0)).to.be.revertedWith(
      "Auction dose not exist."
    );
    await expect(auctionFactory.buy(1)).to.be.revertedWith("You are seller.");

    await expect(
      auctionFactory.connect(user1).buy(1, {
        value: ethers.utils.parseEther("0.9"),
      })
    ).to.be.revertedWith("Insufficient fund");

    await auctionFactory.connect(user1).buy(1, {
      value: ethers.utils.parseEther("1"),
    });

    expect(await nft.balanceOf(await user1.getAddress())).to.equal(2);
    expect(await ethers.provider.getBalance(auctionFactory.address)).to.equal(
      0
    );

    await auctionFactory.connect(user1).create(1, ethers.utils.parseEther("1"));
    await auctionFactory.buy(2, {
      value: ethers.utils.parseEther("1"),
    });
    expect(await nft.balanceOf(await owner.getAddress())).to.equal(1);
  });
});
