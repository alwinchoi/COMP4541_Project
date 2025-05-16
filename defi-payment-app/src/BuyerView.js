import React, { useState } from 'react';
import './BuyerView.css'; // Import specific CSS for this view
import RatingComponent from './RatingComponent';
import DisputeComponent from './DisputeComponent';
import image from './book.jpg';

function BuyerView({ web3, account, sellerAddress, createdOrderIds, setCreatedOrderIds, contractAddress, contractABI, contract }) {
  const [productImage, setProductImage] = useState(image);
  const [productName, setProductName] = useState('Mastering Blockchain Programming with Solidity');
  const [productAuthor, setProductAuthor] = useState('Jitendra Chittoda');
  const [productPriceETH, setProductPriceETH] = useState('0.0002'); // Example price
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState('defi');
  const [orderId, setOrderId] = useState(null); // To store the ID of the currently created order
  const [transactionStatus, setTransactionStatus] = useState('');
  const [merchantAddress, setMerchantAddress] = useState(sellerAddress); // Replace
  const [quantity, setQuantity] = useState(1);
  // const [createdOrderIds, setCreatedOrderIds] = useState([]); // To store a list of created order IDs
  const [selectedOrderIdForInteraction, setSelectedOrderIdForInteraction] = useState('');
  const [orderIdToConfirmDelivery, setOrderIdToConfirmDelivery] = useState('');
  const [deliveryConfirmationStatus, setDeliveryConfirmationStatus] = useState('');

  const totalPriceETH = (parseFloat(productPriceETH) * quantity).toFixed(4);

  console.log('buyer account', account);

  const handleConfirmDelivery = async () => {
    if (!contract || !account) {
      alert('Please connect your wallet and account.');
      return;
    }
  
    setDeliveryConfirmationStatus('Confirming delivery...');
  
    try {
      await contract.methods.confirmDelivery(orderIdToConfirmDelivery)
        .send({ from: account })
        .on('transactionHash', (hash) => {
          setDeliveryConfirmationStatus(`Transaction Hash: ${hash}`);
        })
        .on('receipt', (receipt) => {
          setDeliveryConfirmationStatus(`Order ${orderIdToConfirmDelivery} marked as delivered! Transaction successful: ${receipt.transactionHash}`);
          // Optionally update your local order state
        })
        .on('error', (error) => {
          setDeliveryConfirmationStatus(`Error confirming delivery: ${error.message}`);
        });
    } catch (error) {
      setDeliveryConfirmationStatus(`Error confirming delivery: ${error.message}`);
    }
  };

  const handleConfirmDeliveryDropDown = async () => {
    if (!contract || !account) {
      alert('Please connect your wallet and account.');
      return;
    }
  
    setDeliveryConfirmationStatus('Confirming delivery...');
  
    try {
      await contract.methods.confirmDelivery(orderIdToConfirmDelivery)
        .send({ from: account })
        .on('transactionHash', (hash) => {
          setDeliveryConfirmationStatus(`Transaction Hash: ${hash}`);
        })
        .on('receipt', (receipt) => {
          setDeliveryConfirmationStatus(`Order ${orderIdToConfirmDelivery} marked as delivered! Transaction successful: ${receipt.transactionHash}`);
          // Optionally update your local order state
        })
        .on('error', (error) => {
          setDeliveryConfirmationStatus(`Error confirming delivery: ${error.message}`);
        });
    } catch (error) {
      setDeliveryConfirmationStatus(`Error confirming delivery: ${error.message}`);
    }
  };

  const handlePlaceOrder = async () => {
    console.log(contract);
    console.log("Calling createOrder with account:", account);
    console.log("Calling createOrder with sellerAddress:", sellerAddress);
    if (!contract || !account) {
      alert('Please connect your wallet.');
      return;
    }

    const amountToSendWei = web3.utils.toWei(totalPriceETH, 'ether');

    setTransactionStatus('Placing order...');

    try {
      const receipt = await contract.methods.createOrder(sellerAddress)
        .send({ from: account, value: amountToSendWei });

      setTransactionStatus(`Order placed! Transaction successful: ${receipt.transactionHash}`);
      console.log("createOrder successful. Receipt:", receipt);

      const newOrderId = receipt.events.OrderCreated.returnValues.orderId;
      console.log("New order ID: ", newOrderId);

      if (newOrderId) {
        setOrderId(newOrderId);
        setCreatedOrderIds(prevOrderIds => [...prevOrderIds, newOrderId]);
        setSelectedOrderIdForInteraction(newOrderId); // Automatically select the new order
      } else {
        setTransactionStatus('Order placed, but order ID not found in the event.');
      }

      // Option 2: Fetch all buyer order IDs after the order is created // fix later
      try {
        const buyerOrderIds = await contract.methods.getBuyerOrderIds(account).call({ from: account });
        console.log("All buyer order IDs:", buyerOrderIds);
        // Update your state to reflect the full list of buyer orders
        setCreatedOrderIds(buyerOrderIds); // Replace the current list with the fetched one
        // Optionally, you might want to ensure the newly created order is selected
        if (newOrderId && buyerOrderIds.includes(newOrderId)) {
          setSelectedOrderIdForInteraction(newOrderId);
        } else if (buyerOrderIds.length > 0) {
          setSelectedOrderIdForInteraction(buyerOrderIds[buyerOrderIds.length - 1]); // Select the latest
        }
      } catch (error) {
        console.error("Error fetching buyer order IDs:", error);
        setTransactionStatus(`Order placed, but failed to fetch buyer order list: ${error.message}`);
      }

      setPaymentModalVisible(false);
    } catch (error) {
      setTransactionStatus(`Error placing order: ${error.message}`);
      console.error("Error placing order:", error);
    }
  };

  const handleBuyNow = () => {
    setPaymentModalVisible(true);
  };

  const handlePaymentGatewaySelect = (gateway) => {
    setSelectedPaymentGateway(gateway);
  };

  const handleQuantityChange = (event) => {
    const value = parseInt(event.target.value);
    setQuantity(isNaN(value) || value < 1 ? 1 : value);
  };

  const handleOrderSelection = (event) => {
    setSelectedOrderIdForInteraction(event.target.value);
  };

  const handleDeliverySelection = (event) => {
    setOrderIdToConfirmDelivery(event.target.value);
  };

  return (
    <div className="buyer-view-container">
      <div className="product-details">
        <div className="product-image">
          <img src={productImage} alt={productName} />
        </div>
        <div className="product-info">
          <h1 className="product-title">{productName}</h1>
          <p className="product-author">by {productAuthor}</p>
          <div className="product-pricing">
            <span className="price-eth">{productPriceETH} ETH</span>
            {quantity > 1 && <span className="price-total">({totalPriceETH} ETH total)</span>}
          </div>
          <div className="quantity-selector">
            <label htmlFor="quantity">Quantity:</label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={handleQuantityChange}
              min="1"
            />
          </div>
          <button className="buy-now-button" onClick={handleBuyNow} disabled={!account}>
            Buy Now
          </button>
          {!account && (
            <p className="connect-wallet-prompt">Connect your wallet to make a purchase.</p>
          )}
          {orderId && <p className="order-id">Last Order ID: {orderId}</p>}
          {transactionStatus && <p className="transaction-status">{transactionStatus}</p>}
        </div>
      </div>

      <div className="payment-section">
        {paymentModalVisible && (
          <div className="payment-modal">
            <h3>Choose Payment Gateway</h3>
            <div className="payment-options">
              <label className="payment-option">
                <input
                  type="radio"
                  value="defi"
                  checked={selectedPaymentGateway === 'defi'}
                  onChange={() => handlePaymentGatewaySelect('defi')}
                />
                <span className="gateway-name">DeFi Payment (ETH)</span>
              </label>
              {/* Add other payment options UI here - these won't have functionality */}
              <label className="payment-option disabled">
                <input type="radio" value="paypal" disabled />
                <span className="gateway-name">PayPal</span>
              </label>
              <label className="payment-option disabled">
                <input type="radio" value="creditcard" disabled />
                <span className="gateway-name">Credit Card</span>
              </label>
            </div>
            <div className="payment-actions">
              <button
                className="place-order-button"
                onClick={handlePlaceOrder}
                disabled={!account || selectedPaymentGateway !== 'defi'}
              >
                Place Order
              </button>
              <button className="cancel-button" onClick={() => setPaymentModalVisible(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="seller-interaction-section">
        <h3>Seller Interaction</h3>
        <div className="order-selection">
          <label htmlFor="select-order">Select Order:</label>
          <select
            id="select-order"
            value={selectedOrderIdForInteraction}
            onChange={handleOrderSelection}
          >
            <option value="">-- Select Order --</option>
            {createdOrderIds && createdOrderIds.map(orderId => (
              <option key={orderId} value={orderId}>{orderId}</option>
            ))}
          </select>
        </div>
        <div className="interaction-components">
          <div className="interaction-box">
            <h4>Rate Merchant</h4>
            <RatingComponent
              web3={web3}
              account={account}
              contract={contract}
              orderId={selectedOrderIdForInteraction} // Using the shared selected order ID
              merchantAddress={sellerAddress}
            />
          </div>
          <div className="interaction-box">
            <h4>Report Dispute</h4>
            <DisputeComponent
              web3={web3}
              account={account}
              contract={contract}
              orderId={selectedOrderIdForInteraction} // Using the shared selected order ID
            />
          </div>
        </div>
      </div>

      <div className="delivery-confirmation-section">
        <h3>Confirm Delivery</h3>
        <div className="order-selection">
          <label htmlFor="select-order">Select Order:</label>
          <select
            id="select-order"
            value={orderIdToConfirmDelivery}
            onChange={handleDeliverySelection}
          >
            <option value="">-- Select Order --</option>
            {createdOrderIds && createdOrderIds.map(orderId => (
              <option key={orderId} value={orderId}>{orderId}</option>
            ))}
          </select>
          <div>
            <button onClick={handleConfirmDelivery} disabled={!account || !orderIdToConfirmDelivery}>
              Confirm Delivered
            </button>
          </div>
          {deliveryConfirmationStatus && <p className="delivery-status">{deliveryConfirmationStatus}</p>}
        </div>
        {/* <div className="confirm-delivery-input">
          <label htmlFor="delivery-order-id">Order ID:</label>
          <input
            type="number"
            id="delivery-order-id"
            value={orderIdToConfirmDelivery}
            onChange={(e) => setOrderIdToConfirmDelivery(e.target.value)}
            placeholder="Enter Order ID"
          />
          <button onClick={handleConfirmDelivery} disabled={!account || !orderIdToConfirmDelivery}>
            Confirm Delivered
          </button>
          </div>
          {deliveryConfirmationStatus && <p className="delivery-status">{deliveryConfirmationStatus}</p>}
      </div> */}

    </div>
  );
}

export default BuyerView;