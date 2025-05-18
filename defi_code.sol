// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { Ownable } from "openzeppelin-contracts/access/Ownable.sol";
import { ReentrancyGuard } from "openzeppelin-contracts/utils/ReentrancyGuard.sol";

contract DeFiPaymentGateway is Ownable, ReentrancyGuard {
    // Order status enum
    enum OrderStatus {
        Created,
        Shipped,
        Delivered,
        Disputed,
        Refunded
    }

    // Struct to hold order details
    struct Order {
        address buyer;
        address merchant;
        uint256 amount; // amount paid by buyer
        uint256 originalAmount; // store initial amount for refunds
        OrderStatus status;
        uint256 disputeId;
        uint256 refundAmount;
        uint256 deliveryConfirmationTime; // Added delivery confirmation timestamp
    }

    // Struct to hold dispute details
    struct Dispute {
        address customer;
        address merchant;
        string reason;
        string evidence;
        OrderStatus resolvedStatus;
        uint256 reportedTime; // Added dispute reported timestamp
    }

    // Struct to hold rating details
    struct Rating {
        uint256 rating;
        string comment;
        uint256 timestamp;
        address rater;
    }

    // Mapping to store orders
    mapping(uint256 => Order) public orders;
    // Mapping to store disputes
    mapping(uint256 => Dispute) public disputes;
    // Mapping to store merchant ratings
    mapping(address => Rating[]) public merchantRatings;
    // Mapping to store user reputation
    mapping(address => uint256) public userReputation;
    // Mapping to track order IDs for each seller
    mapping(address => uint256[]) public sellerOrders;
    // Mapping to track dispute IDs for each seller
    mapping(address => uint256[]) public sellerDisputes;
    // Mapping to track all order IDs (for owner)
    uint256[] public allOrderIds;
    // Mapping to track all dispute IDs (for owner)
    uint256[] public allDisputeIds;
    // Order counter
    uint256 public orderCounter;
    // Dispute counter
    uint256 public disputeCounter;
    // Mapping to track if rating has been given for orderId
    mapping(address => mapping(uint256 => bool)) public hasRatedOrder;
    // Mapping to track order IDs for each buyer
    mapping(address => uint256[]) public buyerOrders;

    mapping(address => uint256) public merchantAverageRating;
    mapping(address => uint256) public merchantRatingCount;

    // Events
    event OrderCreated(uint256 orderId, address buyer, address merchant, uint256 amount);
    event OrderShipped(uint256 orderId);
    event OrderDelivered(uint256 orderId);
    event DisputeReported(uint256 disputeId, address customer, uint256 orderId);
    event DisputeResolved(uint256 disputeId, OrderStatus resolvedStatus);
    event RatingGiven(address merchant, uint256 rating, string comment, address rater);
    event Purchase(address buyer, address merchant, uint256 amount);
    event RefundInitiated(uint256 orderId, uint256 amount);
    event PaymentSent(uint256 orderId, address recipient, uint256 amount); // Define the PaymentSent event

    // Constants for dispute window (e.g., 7 days in seconds)
    uint256 public constant DISPUTE_WINDOW = 7 days;

    // Modifier to check if the order status is Created
    modifier onlyCreated(uint256 orderId) {
        require(orders[orderId].status == OrderStatus.Created, "Order not in created state");
        _;
    }

    // Modifier to check if the order status is Shipped
    modifier onlyShipped(uint256 orderId) {
        require(orders[orderId].status == OrderStatus.Shipped, "Order not shipped");
        _;
    }

    // Modifier to check if the caller is the merchant of the order
    modifier onlyOrderMerchant(uint256 orderId) {
        require(orders[orderId].merchant == msg.sender, "Only merchant of this order can call this");
        _;
    }

    // Modifier to check if the caller is the buyer of the order
    modifier onlyBuyer(uint256 orderId) {
        require(orders[orderId].buyer == msg.sender, "Only buyer of this order can call this");
        _;
    }

    // Modifier to check if it is the related seller and buyer
    modifier onlyOrderParticipant(uint256 orderId) {
        require(orders[orderId].buyer == msg.sender || orders[orderId].merchant == msg.sender, "Only buyer or merchant of this order can view details");
        _;
    }


    /**
     * @notice Constructor.
     * @dev Can only be called once upon contract deployment by the deployer.
     * @param _owner The initial owner of the contract.
     */
    constructor(address _owner) Ownable(_owner) {}

    /**
     * @notice Creates a new order.
     * @dev Can only be called by anyone (buyer).
     * @param merchant The address of the merchant.
     * @return orderId The ID of the created order.
     * @dev Emits OrderCreated and Purchase events.
     */
    function createOrder(address merchant) payable external returns (uint256 orderId) {
        // Input: address merchant, msg.value (in wei sent with the transaction)
        // Expected Output: uint256 orderId
        // Callable By: Buyer
        require(msg.value > 0, "Order amount must be greater than zero");
        orderCounter++;
        orderId = orderCounter;
        orders[orderId] = Order({
            buyer: msg.sender,
            merchant: merchant,
            amount: msg.value,
            originalAmount: msg.value,
            status: OrderStatus.Created,
            disputeId: 0,
            refundAmount: 0,
            deliveryConfirmationTime: 0
        });
        sellerOrders[merchant].push(orderId);
        buyerOrders[msg.sender].push(orderId);
        allOrderIds.push(orderId);

        emit OrderCreated(orderId, msg.sender, merchant, msg.value);
        emit Purchase(msg.sender, merchant, msg.value);
        return orderId;
    }

    /**
     * @notice Marks an order as shipped.
     * @dev Can only be called by the merchant of the order.
     * @param orderId The ID of the order to mark as shipped.
     * @dev Requires the order status to be Created.
     * @dev Emits OrderShipped event.
     */
    function markOrderShipped(uint256 orderId) external onlyOrderMerchant(orderId) onlyCreated(orderId) {
        // Input: uint256 orderId
        // Expected Output: None
        // Callable By: Merchant
        orders[orderId].status = OrderStatus.Shipped;
        emit OrderShipped(orderId);
        // Expected error if not merchant: OwnableUnauthorizedAccount(address)
    }

    /**
     * @notice Confirms the delivery of an order.
     * @dev Can only be called by the buyer of the order.
     * @param orderId The ID of the order to confirm delivery for.
     * @dev Requires the order status to be Shipped.
     * @dev Emits OrderDelivered event.
     */
    function confirmDelivery(uint256 orderId) external onlyBuyer(orderId) onlyShipped(orderId) nonReentrant payable {
        // Input: uint256 orderId
        // Expected Output: None
        // Callable By: Buyer
        require(orders[orderId].status == OrderStatus.Shipped, "Order not shipped"); // Re-assert for clarity
        require(orders[orderId].status != OrderStatus.Delivered, "Order has already been confirmed as delivered");

        orders[orderId].status = OrderStatus.Delivered;
        orders[orderId].deliveryConfirmationTime = block.timestamp;
        emit OrderDelivered(orderId);
        // Expected error if not buyer: OwnableUnauthorizedAccount(address)

        // Transfer payment to the merchant
        uint256 amountToTransfer = orders[orderId].amount;
        require(amountToTransfer > 0, "No funds to transfer to the merchant"); 
        orders[orderId].amount = 0; // Prevent paying out again
        
        (bool success, ) = payable(orders[orderId].merchant).call{ value: amountToTransfer }("");
        require(success, "Payment to merchant failed");
        
        // Optionally emit an event for payment being sent
        emit PaymentSent(orderId, orders[orderId].merchant, amountToTransfer);
    }

    /**
     * @notice Reports a dispute for an order.
     * @dev Can only be called by the buyer of the order.
     * @param orderId The ID of the order to report a dispute for.
     * @param reason The reason for the dispute.
     * @param evidence Link or details of the evidence.
     * @return disputeId The ID of the reported dispute.
     * @dev Allows reporting a dispute even after delivery, within the dispute window.
     * @dev Emits DisputeReported event.
     */
    function reportDispute(uint256 orderId, string memory reason, string memory evidence) external onlyBuyer(orderId) returns (uint256 disputeId) {
        // Input: uint256 orderId, string reason, string evidence
        // Expected Output: uint256 disputeId
        // Callable By: Buyer
        require(orders[orderId].status == OrderStatus.Delivered, "Cannot report dispute before delivery confirmation");
        require(block.timestamp <= orders[orderId].deliveryConfirmationTime + DISPUTE_WINDOW, "Dispute window has expired");
        require(orders[orderId].disputeId == 0, "A dispute has already been reported for this order"); // Prevent multiple reports

        disputeCounter++;
        disputeId = disputeCounter;
        orders[orderId].disputeId = disputeId;
        orders[orderId].status = OrderStatus.Disputed;
        disputes[disputeId] = Dispute({
            customer: msg.sender,
            merchant: orders[orderId].merchant,
            reason: reason,
            evidence: evidence,
            resolvedStatus: OrderStatus.Created,
            reportedTime: block.timestamp
        });
        sellerDisputes[orders[orderId].merchant].push(disputeId);
        allDisputeIds.push(disputeId);
        emit DisputeReported(disputeId, msg.sender, orderId);
        return disputeId;
        // Expected error if not buyer: OwnableUnauthorizedAccount(address)
    }

    /**
    * @notice Allows the seller to fully refund the buyer and resolves the associated dispute.
    * @dev Can only be called by the merchant of the order.
    * @param orderId The ID of the order to refund.
    */
    function refundFromSeller(uint256 orderId) external onlyOrderMerchant(orderId) nonReentrant payable {
        // Input: uint256 orderId
        // Expected Output: None
        // Callable By: Merchant
        require(orders[orderId].status == OrderStatus.Disputed, "Order must be in Disputed status for a refund");
        require(orders[orderId].disputeId > 0, "Order does not have an associated dispute");
        require(msg.value == orders[orderId].originalAmount, "Refund amount must match the original order amount"); // Ensure seller sends the correct amount

        // uint256 amountToRefund = orders[orderId].amount;
        // orders[orderId].refundAmount = amountToRefund;
        orders[orderId].refundAmount = msg.value;
        orders[orderId].status = OrderStatus.Refunded;
        disputes[orders[orderId].disputeId].resolvedStatus = OrderStatus.Refunded;

        emit DisputeResolved(orders[orderId].disputeId, OrderStatus.Refunded);

        (bool success, ) = payable(orders[orderId].buyer).call{ value: msg.value }("");
        require(success, "Refund transfer failed");
        emit RefundInitiated(orderId, msg.value);
        // Expected error if not merchant: OwnableUnauthorizedAccount(address)
    }

    /**
     * @notice Rates a merchant for an order.
     * @dev Can only be called by the buyer of the order.
     * @param merchant The address of the merchant to rate.
     * @param rating The rating given to the merchant (1-5).
     * @param comment Optional comment for the rating.
     * @param orderId The ID of the order related to the rating.
     * @dev Requires the rating to be between 1 and 5 and the order status to be Delivered.
     * @dev Emits RatingGiven event.
     */
    function rateMerchant(address merchant, uint256 rating, string memory comment, uint256 orderId) external onlyBuyer(orderId) {
        // Input: address merchant, uint256 rating (1-5), string comment, uint256 orderId
        // Expected Output: None
        // Callable By: Buyer
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        // require(orders[orderId].status == OrderStatus.Delivered, "Order must be delivered to rate");
        require(orders[orderId].status == OrderStatus.Delivered ||
        orders[orderId].status == OrderStatus.Disputed ||
        orders[orderId].status == OrderStatus.Refunded,
        "Has to be shipped and delivered first");

        require(!hasRatedOrder[msg.sender][orderId], "You have already rated this order.");

        require(merchant == orders[orderId].merchant, "Incorrect merchant address for this order");

        // Update average rating and count
        uint256 currentAverage = merchantAverageRating[merchant];
        uint256 currentCount = merchantRatingCount[merchant];
        uint256 newAverage;
        if (currentCount == 0) {
            newAverage = rating;
        } else {
            newAverage = ((currentAverage * currentCount) + rating) / (currentCount + 1);
        }
        merchantAverageRating[merchant] = newAverage;
        merchantRatingCount[merchant]++;

        merchantRatings[merchant].push(Rating(rating, comment, block.timestamp, msg.sender));
        userReputation[msg.sender]++;
        hasRatedOrder[msg.sender][orderId] = true; // Mark that the buyer has rated this order
        emit RatingGiven(merchant, rating, comment, msg.sender);
        // Expected error if not buyer: OwnableUnauthorizedAccount(address)
    }

    /**
     * @notice Gets the merchant's average rating.
     * @dev Can be called by anyone.
     * @param merchant The address of the merchant.
     * @return averageRating The average rating of the merchant (0 if no ratings).
     */
    function getMerchantAverageRating(address merchant) external view returns (uint256 averageRating) {
        // Input: address merchant
        // Expected Output: uint256 averageRating
        // Callable By: Anyone
        return merchantAverageRating[merchant];
    }

    /**
    * @notice Gets the list of order IDs for a specific buyer.
    * @dev Can be called by anyone.
    * @param buyer The address of the buyer.
    * @return The array of order IDs for the buyer.
    */
    function getBuyerOrderIds(address buyer) external view returns (uint256[] memory) {
        return buyerOrders[buyer];
    }

   /**
     * @notice Gets the list of order IDs for a specific seller.
     * @dev Can only be called by the seller.
     * @param seller The address of the seller.
     * @return The array of order IDs for the seller.
     */
    function getSellerOrderIds(address seller) external view returns (uint256[] memory) {
        // Input: address seller
        // Expected Output: uint256[] memory
        // Callable By: Seller
        require(seller == msg.sender, "Only the seller can view their order IDs");
        return sellerOrders[seller];
        // Expected error if not seller: "Only the seller can view their order IDs"
    }

    /**
     * @notice Gets the list of dispute IDs for a specific seller.
     * @dev Can only be called by the seller.
     * @param seller The address of the seller.
     * @return The array of dispute IDs for the seller.
     */
    function getSellerDisputeIds(address seller) external view returns (uint256[] memory) {
        // Input: address seller
        // Expected Output: uint256[] memory
        // Callable By: Seller
        require(seller == msg.sender, "Only the seller can view their dispute IDs");
        return sellerDisputes[seller];
        // Expected error if not seller: "Only the seller can view their dispute IDs"
    }

    /**
     * @notice Gets the details of a specific order.
     * @dev Can be called by anyone.
     * @param orderId The ID of the order.
     * @return The order details.
     */
    function getOrderDetails(uint256 orderId) external view onlyOrderParticipant(orderId) returns (Order memory) {
        // Input: uint256 orderId
        // Expected Output: Order memory
        // Callable By: Anyone
        return orders[orderId];
        // Expected error if not seller or buyer: "Only buyer or merchant of this order can view details"
    }

    /**
     * @notice Gets the details of a specific dispute.
     * @dev Can be called by anyone.
     * @param disputeId The ID of the dispute.
     * @return The dispute details.
     */
    function getDisputeDetails(uint256 disputeId) external view returns (Dispute memory) {
        // Input: uint256 disputeId
        // Expected Output: Dispute memory
        // Callable By: Anyone
        return disputes[disputeId];
    }

    /**
     * @notice Internal helper function to get order ID from dispute ID.
     * @param disputeId The ID of the dispute.
     * @return The ID of the associated order, or 0 if not found.
     */
    function _getOrderIdFromDisputeId(uint256 disputeId) internal view returns (uint256) {
        for (uint256 i = 1; i <= orderCounter; i++) {
            if (orders[i].disputeId == disputeId) {
                return i;
            }
        }
        return 0;
    }
}