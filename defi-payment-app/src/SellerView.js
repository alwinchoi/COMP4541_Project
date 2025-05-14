import React, { useState, useEffect } from 'react';

function SellerView({ web3, account, contract }) {
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [orders, setOrders] = useState([]);
  const [transactionStatus, setTransactionStatus] = useState('');

  const handleConnectAccount = async () => {
    if (!web3) {
      alert('Web3 not initialized. Please connect your wallet first.');
      return;
    }
    const accounts = await web3.eth.getAccounts();
    if (accounts.length > 0) {
      setConnectedAccount(accounts[0]);
      // In a real app, you might fetch orders related to this account
      // For demonstration, we'll just show a placeholder
      setOrders([
        { orderId: 1, buyer: '0x...', status: 'Created' },
        { orderId: 2, buyer: '0x...', status: 'Shipped' },
        // ... more orders
      ]);
    } else {
      alert('No accounts found. Please connect your wallet.');
    }
  };

  const handleMarkShipped = async (orderIdToShip) => {
    if (!contract || !connectedAccount) {
      alert('Please connect your wallet and account.');
      return;
    }

    setTransactionStatus(`Marking order ${orderIdToShip} as shipped...`);

    try {
      await contract.methods.markOrderShipped(orderIdToShip)
        .send({ from: connectedAccount })
        .on('transactionHash', (hash) => {
          setTransactionStatus(`Transaction Hash: ${hash}`);
        })
        .on('receipt', (receipt) => {
          setTransactionStatus(`Order ${orderIdToShip} marked as shipped! Transaction successful: ${receipt.transactionHash}`);
          // Update the orders state to reflect the change
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.orderId === orderIdToShip ? { ...order, status: 'Shipped' } : order
            )
          );
        })
        .on('error', (error) => {
          setTransactionStatus(`Error marking order as shipped: ${error.message}`);
        });
    } catch (error) {
      setTransactionStatus(`Error marking order as shipped: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Seller View</h2>
      {!connectedAccount ? (
        <button onClick={handleConnectAccount}>Connect Seller Account</button>
      ) : (
        <p>Connected Account: {connectedAccount.substring(0, 6)}...{connectedAccount.slice(-4)}</p>
      )}

      {orders.length > 0 && connectedAccount && (
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Buyer</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.orderId}>
                <td>{order.orderId}</td>
                <td>{order.buyer.substring(0, 6)}...{order.buyer.slice(-4)}</td>
                <td>{order.status}</td>
                <td>
                  {order.status === 'Created' && (
                    <button onClick={() => handleMarkShipped(order.orderId)} disabled={!connectedAccount}>
                      Mark as Shipped
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {transactionStatus && <p>{transactionStatus}</p>}
    </div>
  );
}

export default SellerView;