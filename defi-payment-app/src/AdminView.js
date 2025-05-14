import React, { useState, useEffect } from 'react';

function AdminView({ web3, account, contract }) {
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [disputes, setDisputes] = useState([]); // Placeholder for dispute data
  const [refundDisputeId, setRefundDisputeId] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');

  const handleConnectAccount = async () => {
    if (!web3) {
      alert('Web3 not initialized. Please connect your wallet first.');
      return;
    }
    const accounts = await web3.eth.getAccounts();
    if (accounts.length > 0) {
      setConnectedAccount(accounts[0]);
      // In a real app, fetch dispute data
      setDisputes([
        { disputeId: 101, orderId: 1, buyer: '0x...', seller: '0x...', reason: 'Damaged' },
        { disputeId: 102, orderId: 3, buyer: '0x...', seller: '0x...', reason: 'Not as described' },
        // ... more disputes
      ]);
    } else {
      alert('No accounts found. Please connect your wallet.');
    }
  };

  const handleRefundDispute = async () => {
    if (!contract || !connectedAccount) {
      alert('Please connect your wallet and account.');
      return;
    }

    if (!refundDisputeId) {
      alert('Please enter the Dispute ID to refund.');
      return;
    }

    setTransactionStatus(`Refunding dispute ${refundDisputeId}...`);

    try {
      await contract.methods.resolveDispute(refundDisputeId, 4 /* OrderStatus.Refunded */)
        .send({ from: connectedAccount })
        .on('transactionHash', (hash) => {
          setTransactionStatus(`Transaction Hash: ${hash}`);
        })
        .on('receipt', (receipt) => {
          setTransactionStatus(`Dispute ${refundDisputeId} refunded! Transaction successful: ${receipt.transactionHash}`);
          setRefundDisputeId('');
          // Update dispute state if needed
        })
        .on('error', (error) => {
          setTransactionStatus(`Error refunding dispute: ${error.message}`);
        });
    } catch (error) {
      setTransactionStatus(`Error refunding dispute: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Admin View</h2>
      {!connectedAccount ? (
        <button onClick={handleConnectAccount}>Connect Admin Account</button>
      ) : (
        <p>Connected Account: {connectedAccount.substring(0, 6)}...{connectedAccount.slice(-4)}</p>
      )}

      {disputes.length > 0 && connectedAccount && (
        <table>
          <thead>
            <tr>
              <th>Dispute ID</th>
              <th>Order ID</th>
              <th>Buyer</th>
              <th>Seller</th>
              <th>Reason</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map(dispute => (
              <tr key={dispute.disputeId}>
                <td>{dispute.disputeId}</td>
                <td>{dispute.orderId}</td>
                <td>{dispute.buyer.substring(0, 6)}...{dispute.buyer.slice(-4)}</td>
                <td>{dispute.seller.substring(0, 6)}...{dispute.seller.slice(-4)}</td>
                <td>{dispute.reason}</td>
                <td>
                  <button onClick={handleRefundDispute} disabled={!connectedAccount}>
                    Refund Dispute
                  </button>
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

export default AdminView;