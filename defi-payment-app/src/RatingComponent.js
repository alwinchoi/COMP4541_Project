import React, { useState, useEffect } from 'react';

function RatingComponent({ web3, account, contract, orderId, merchantAddress }) {
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');
  const [averageRating, setAverageRating] = useState(null);

  useEffect(() => {
    const fetchAverageRating = async () => {
      if (contract && merchantAddress) {
        try {
          const avgRating = await contract.methods.getMerchantAverageRating(merchantAddress).call();
          setAverageRating(avgRating);
        } catch (error) {
          console.error("Error fetching average rating:", error);
        }
      }
    };

    fetchAverageRating();
  }, [contract, merchantAddress]);

  const handleRateSeller = async () => {
    if (!contract || !account || !orderId || !merchantAddress) {
      alert('Please connect your wallet and ensure order and merchant details are available.');
      return;
    }

    if (!rating || parseInt(rating) < 1 || parseInt(rating) > 5) {
      alert('Rating must be between 1 and 5.');
      return;
    }

    setTransactionStatus('Rating seller...');

    try {
      await contract.methods.rateMerchant(merchantAddress, parseInt(rating), comment, orderId)
        .send({ from: account })
        .on('transactionHash', (hash) => {
          setTransactionStatus(`Transaction Hash: ${hash}`);
        })
        .on('receipt', async (receipt) => { // Make the callback async
          setTransactionStatus(`Seller rated successfully! Transaction successful: ${receipt.transactionHash}`);
          setRating('');
          setComment('');
          // Fetch updated average rating
          try {
            const avgRating = await contract.methods.getMerchantAverageRating(merchantAddress).call();
            setAverageRating(avgRating);
          } catch (error) {
            console.error("Error fetching updated average rating:", error);
          }
        })
        .on('error', (error) => {
          setTransactionStatus(`Error rating seller: ${error.message}`);
        });
    } catch (error) {
      setTransactionStatus(`Error rating seller: ${error.message}`);
    }
  };

  return (
    <div className="rating-component">
      <h4>Rate Seller</h4>
      {averageRating !== null && <p>Average Rating: {averageRating / 100 /* Assuming the contract returns scaled rating */} / 5</p>} {/* Adjust scaling if needed */}
      <input
        type="number"
        placeholder="Rating (1-5)"
        value={rating}
        onChange={(e) => setRating(e.target.value)}
      />
      <textarea
        placeholder="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button onClick={handleRateSeller} disabled={!account || !orderId || !merchantAddress}>Rate Seller</button>
      {transactionStatus && <p>{transactionStatus}</p>}
    </div>
  );
}

export default RatingComponent;