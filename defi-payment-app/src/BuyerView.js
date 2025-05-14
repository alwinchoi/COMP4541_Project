import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import './BuyerView.css'; // Import specific CSS for this view
import RatingComponent from './RatingComponent';
import DisputeComponent from './DisputeComponent';
import image from './book.jpg';

function BuyerView({ web3, account, contract }) {
  const [productImage, setProductImage] = useState(image);
  const [productName, setProductName] = useState('Mastering Blockchain Programming with Solidity');
  const [productAuthor, setProductAuthor] = useState('Jitendra Chittoda');
  const [productPriceETH, setProductPriceETH] = useState('0.005'); // Example price
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState('defi');
  const [orderId, setOrderId] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState('');
  const [merchantAddress, setMerchantAddress] = useState('YOUR_SELLER_ADDRESS'); // Replace
  const [quantity, setQuantity] = useState(1);

  const totalPriceETH = (parseFloat(productPriceETH) * quantity).toFixed(4);

  const handlePlaceOrder = async () => {
    if (!contract || !account) {
      alert('Please connect your wallet.');
      return;
    }

    const amountToSendWei = web3.utils.toWei(totalPriceETH, 'ether');

    setTransactionStatus('Placing order...');

    try {
      await contract.methods.createOrder(merchantAddress)
        .send({ from: account, value: amountToSendWei })
        .on('transactionHash', (hash) => {
          setTransactionStatus(`Transaction Hash: ${hash}`);
        })
        .on('receipt', (receipt) => {
          setTransactionStatus(`Order placed! Transaction successful: ${receipt.transactionHash}`);
          setOrderId(receipt.events.OrderCreated.returnValues.orderId);
          setPaymentModalVisible(false);
        })
        .on('error', (error) => {
          setTransactionStatus(`Error placing order: ${error.message}`);
        });
    } catch (error) {
      setTransactionStatus(`Error placing order: ${error.message}`);
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
          {orderId && <p className="order-id">Order ID: {orderId}</p>}
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
        {orderId && account && contract && merchantAddress ? (
          <div className="interaction-components">
            <RatingComponent
              web3={web3}
              account={account}
              contract={contract}
              orderId={orderId}
              merchantAddress={merchantAddress}
            />
            <DisputeComponent
              web3={web3}
              account={account}
              contract={contract}
              orderId={orderId}
            />
          </div>
        ) : (
          <p className="interaction-prompt">Order must be placed to interact with the seller.</p>
        )}
      </div>
    </div>
  );
}

export default BuyerView;