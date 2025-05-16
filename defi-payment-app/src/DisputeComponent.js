import React, { useState } from 'react';
import './disputeComponent.css'; // Import specific CSS for this view

function DisputeComponent({ web3, account, contract, orderId }) {
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');

  const handleReportDispute = async () => {
    if (!contract || !account || !orderId) {
      alert('Please connect your wallet and ensure order details are available.');
      return;
    }

    if (!reason) {
      alert('Please provide a reason for the dispute.');
      return;
    }

    setTransactionStatus('Reporting dispute...');

    try {
      await contract.methods.reportDispute(orderId, reason, evidence)
        .send({ from: account })
        .on('transactionHash', (hash) => {
          setTransactionStatus(`Transaction Hash: ${hash}`);
        })
        .on('receipt', (receipt) => {
          setTransactionStatus(`Dispute reported! Dispute ID: ${receipt.events.DisputeReported.returnValues.disputeId}, Transaction successful: ${receipt.transactionHash}`);
          setReason('');
          setEvidence('');
        })
        .on('error', (error) => {
          setTransactionStatus(`Error reporting dispute: ${error.message}`);
        });
    } catch (error) {
      setTransactionStatus(`Error reporting dispute: ${error.message}`);
    }
  };

  return (
    <div className="dispute-component">
      <textarea
        placeholder="Reason for dispute"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <textarea
        placeholder="Evidence (optional)"
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
      />
      <button onClick={handleReportDispute} disabled={!account || !orderId}>Report Dispute</button>
      {transactionStatus && <p>{transactionStatus}</p>}
    </div>
  );
}

export default DisputeComponent;