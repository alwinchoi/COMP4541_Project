// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { Ownable } from "openzeppelin-contracts/access/Ownable.sol";

contract DeFiPaymentGateway is Ownable {
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
        uint256 amount;
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

    // Events
    event OrderCreated(uint256 orderId, address buyer, address merchant, uint256 amount);
    event OrderShipped(uint256 orderId);
    event OrderDelivered(uint256 orderId);
    event DisputeReported(uint256 disputeId, address customer, uint256 orderId);
    event DisputeResolved(uint256 disputeId, OrderStatus resolvedStatus);
    event RatingGiven(address merchant, uint256 rating, string comment, address rater);
    event Purchase(address buyer, address merchant, uint256 amount);
    event RefundInitiated(uint256 orderId, uint256 amount);

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

    // Modifier to check if the caller is the merchant of the dispute
    modifier onlyDisputeMerchant(uint256 disputeId) {
        require(disputes[disputeId].merchant == msg.sender, "Only merchant of this dispute can call this");
        _;
    }

    modifier onlyResolved(uint256 disputeId) {
        require(disputes[disputeId].resolvedStatus != OrderStatus.Created, "Dispute already resolved");
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
            status: OrderStatus.Created,
            disputeId: 0,
            refundAmount: 0,
            deliveryConfirmationTime: 0
        });
        sellerOrders[merchant].push(orderId);
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
    function confirmDelivery(uint256 orderId) external onlyBuyer(orderId) onlyShipped(orderId) {
        // Input: uint256 orderId
        // Expected Output: None
        // Callable By: Buyer
        orders[orderId].status = OrderStatus.Delivered;
        orders[orderId].deliveryConfirmationTime = block.timestamp;
        emit OrderDelivered(orderId);
        // Expected error if not buyer: OwnableUnauthorizedAccount(address)
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
        require(orders[orderId].status != OrderStatus.Created, "Cannot report dispute for a created order");
        require(block.timestamp <= orders[orderId].deliveryConfirmationTime + DISPUTE_WINDOW, "Dispute window has expired");

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
     * @notice Resolves a dispute and fully refunds the buyer. 
     * @notice Expected error if not owner: OwnableUnauthorizedAccount(address)
     * @dev Can only be called by the owner of the contract.
     * @param disputeId The ID of the dispute to resolve.
     * @param resolvedStatus The resolved status of the order (must be Refunded for full refund).
     */
    function resolveDispute(uint256 disputeId, OrderStatus resolvedStatus) external onlyOwner {
        // Input: uint256 disputeId, OrderStatus resolvedStatus (must be Refunded for full refund)
        // Expected Output: None
        // Callable By: Owner
        require(disputes[disputeId].resolvedStatus == OrderStatus.Created, "Dispute already resolved");
        disputes[disputeId].resolvedStatus = resolvedStatus;
        uint256 orderId = _getOrderIdFromDisputeId(disputeId);
        require(orderId != 0, "Order Id not found for this dispute");

        orders[orderId].status = resolvedStatus;

        if (resolvedStatus == OrderStatus.Refunded) {
            uint256 amountToRefund = orders[orderId].amount;
            orders[orderId].refundAmount = amountToRefund;
            (bool success, ) = payable(orders[orderId].buyer).call{ value: amountToRefund }("");
            require(success, "Refund transfer failed");
            emit RefundInitiated(orderId, amountToRefund);
        }

        emit DisputeResolved(disputeId, resolvedStatus);
        // Expected error if not owner: OwnableUnauthorizedAccount(address)
    }

    /**
     * @notice Allows the seller to fully refund the buyer.
     * @dev Can only be called by the merchant of the order.
     * @param orderId The ID of the order to refund.
     */
    function refundFromSeller(uint256 orderId) external onlyOrderMerchant(orderId) {
        // Input: uint256 orderId
        // Expected Output: None
        // Callable By: Merchant
        require(orders[orderId].status != OrderStatus.Delivered, "Order already delivered, use dispute if needed for full refund");

        uint256 amountToRefund = orders[orderId].amount;
        orders[orderId].refundAmount = amountToRefund;
        orders[orderId].status = OrderStatus.Refunded;

        (bool success, ) = payable(orders[orderId].buyer).call{ value: amountToRefund }("");
        require(success, "Refund transfer failed");
        emit RefundInitiated(orderId, amountToRefund);
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
        require(orders[orderId].status == OrderStatus.Delivered, "Order must be delivered to rate");
        merchantRatings[merchant].push(Rating(rating, comment, block.timestamp, msg.sender));
        userReputation[msg.sender]++;
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
        uint256 totalRating = 0;
        uint256 numRatings = merchantRatings[merchant].length;
        if (numRatings == 0) {
            return 0;
        }
        for (uint256 i = 0; i < numRatings; i++) {
            totalRating += merchantRatings[merchant][i].rating;
        }
        averageRating = totalRating / numRatings;
        return averageRating;
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
    function getOrderDetails(uint256 orderId) external view returns (Order memory) {
        // Input: uint256 orderId
        // Expected Output: Order memory
        // Callable By: Anyone
        return orders[orderId];
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
     * @notice Gets the list of all order IDs (only for the owner).
     * @notice Expected error if not owner: OwnableUnauthorizedAccount(address)
     * @dev Can only be called by the owner.
     * @return The array of all order IDs.
     */
    function getAllOrderIds() external view onlyOwner returns (uint256[] memory) {
        return allOrderIds;
        // Expected error if not owner: OwnableUnauthorizedAccount(address)
    }

    /**
     * @notice Gets the list of all dispute IDs (only for the owner).
     * @notice Expected error if not owner: OwnableUnauthorizedAccount(address)
     * @dev Can only be called by the owner.
     * @return The array of all dispute IDs.
     */
    function getAllDisputeIds() external view onlyOwner returns (uint256[] memory) {
        return allDisputeIds;
        // Expected error if not owner: OwnableUnauthorizedAccount(address)
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