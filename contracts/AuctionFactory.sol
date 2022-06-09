// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract AuctionFactory is ReentrancyGuard {
    using Counters for Counters.Counter;
    //static
    Counters.Counter private _auctionIds;

    IERC721 public immutable nft;

    struct Auction {
        address payable seller;
        uint96 bidAmount;
        address bidder;
        uint96 auctionId;
        uint96 reservePrice;
        uint96 tokenId;
    }

    mapping(uint96 => Auction) public auctions;

    event AuctionCreated(
        uint indexed auctionId,
        address payable indexed seller,
        uint indexed tokenId,
        uint reservePrice
    );
    event AuctionResolved(uint auctionId, address buyer, uint price);
    event AuctionCanceled(uint auctionId);
    event Bid(uint auctionId, address bidder, uint bid);

    constructor(address _nft) {
        nft = IERC721(_nft);
    }

    function create(
        uint96 _tokenId,
        uint96 _reservePrice
    ) external payable nonReentrant {
        require(nft.ownerOf(_tokenId) == msg.sender, "You have no this token.");
        _auctionIds.increment();
        uint96 auctionId = uint96(_auctionIds.current());

        Auction storage auction = auctions[auctionId];
        auction.auctionId = auctionId;
        auction.seller = payable(msg.sender);
        auction.tokenId = _tokenId;
        auction.reservePrice = _reservePrice;

        IERC721(nft).transferFrom(auction.seller, address(this), auction.tokenId);

        emit AuctionCreated(
            auctionId,
            payable(msg.sender),
            _tokenId,
            _reservePrice
        );
    }

    function bid(uint96 _auctionId) external payable nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(auction.seller != payable(0), "Auction dose not exist.");
        require(auction.bidAmount < msg.value, "Insufficient fund");
        require(auction.seller != payable(msg.sender), "You are seller.");
        uint96 newBid = uint96(msg.value);

        if (auction.bidAmount > 0) {
            payable(auction.bidder).transfer(auction.bidAmount);
        }

        auction.bidAmount = newBid;
        if (msg.sender != auction.bidder) {
            auction.bidder = msg.sender;
        }
        emit Bid(_auctionId, msg.sender, newBid);
    }

    function sell(uint96 _auctionId) external nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(auction.seller != payable(0), "Auction dose not exist.");
        require(payable(msg.sender) == auction.seller, "You are not a seller.");
        require(auction.bidAmount > 0, "There is no bid.");

        // transfer tokens to highest bidder
        nft.transferFrom(address(this), auction.bidder, auction.tokenId);
        payable(auction.bidder).transfer(auction.bidAmount);

        emit AuctionResolved(_auctionId, auction.bidder, auction.bidAmount);
        delete auctions[_auctionId];
    }

    function cancel(uint96 _auctionId) external nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(auction.seller != payable(0), "Auction dose not exist.");
        require(payable(msg.sender) == auction.seller, "You are not a seller.");

        if (auction.bidAmount > 0)
            payable(auction.bidder).transfer(auction.bidAmount);
        IERC721(nft).transferFrom(address(this), auction.seller, auction.tokenId);

        emit AuctionCanceled(_auctionId);
        delete auctions[_auctionId];
    }

    function buy(uint96 _auctionId) external payable nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(auction.seller != payable(0), "Auction dose not exist.");
        require(auction.seller != payable(msg.sender), "You are seller.");
        require(auction.reservePrice <= msg.value, "Insufficient fund");

        if (auction.bidAmount > 0) {
            payable(auction.bidder).transfer(auction.bidAmount);
        }

        nft.transferFrom(address(this), msg.sender, auction.tokenId);
        payable(auction.seller).transfer(auction.reservePrice);

        emit AuctionResolved(_auctionId, msg.sender, auction.reservePrice);
        delete auctions[_auctionId];
    }

    function getAuction(uint96 _auctionId) external view returns (Auction memory) {
        require(auctions[_auctionId].seller != payable(0), "Auction dose not exist.");
        return auctions[_auctionId];
    }
}