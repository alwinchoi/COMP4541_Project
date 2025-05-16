import React, { useState, useEffect } from 'react';
import './SellerView.css'; // Import specific CSS for this view

function SellerView({ web3, account, contract }) {
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerDisputes, setSellerDisputes] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingDisputes, setLoadingDisputes] = useState(true);
  const [errorOrders, setErrorOrders] = useState('');
  const [errorDisputes, setErrorDisputes] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');

  console.log("Sellerview account", account);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    setErrorOrders('');
    console.log("fetchOrders called in SellerView with account:", account);
    try {
      const orderIds = await contract.methods.getSellerOrderIds(account).call({ from: account });
      const fetchedOrders = [];
      for (const orderId of orderIds) {
        const order = await contract.methods.orders(orderId).call();
        fetchedOrders.push({ ...order, orderId: parseInt(orderId) });
      }
      setSellerOrders(fetchedOrders);
      console.log(sellerOrders);
    } catch (error) {
      console.error("Error fetching seller orders:", error);
      setErrorOrders("Failed to fetch orders.");
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchDisputes = async () => {
    setLoadingDisputes(true);
    setErrorDisputes('');
    try {
      const disputeIds = await contract.methods.getSellerDisputeIds(account).call({ from: account });
      const fetchedDisputes = [];
      for (const disputeId of disputeIds) {
        const dispute = await contract.methods.disputes(disputeId).call();
        fetchedDisputes.push({ ...dispute, disputeId: parseInt(disputeId) });
      }
      setSellerDisputes(fetchedDisputes);
    } catch (error) {
      console.error("Error fetching seller disputes:", error);
      setErrorDisputes("Failed to fetch disputes.");
    } finally {
      setLoadingDisputes(false);
    }
  };


  useEffect(() => {
    
    const fetchSellerData = async () => {
      if (contract && account) {
        await fetchOrders();
        await fetchDisputes();
      }
    };

    fetchSellerData();
  }, [contract, account]);

  const handleMarkShipped = async (orderIdToShip) => {
    if (!contract || !account) {
      alert('Please connect your wallet and account.');
      return;
    }

    setTransactionStatus(`Marking order ${orderIdToShip} as shipped...`);

    try {
      await contract.methods.markOrderShipped(orderIdToShip)
        .send({ from: account })
        .on('transactionHash', (hash) => {
          setTransactionStatus(`Transaction Hash: ${hash}`);
        })
        .on('receipt', (receipt) => {
          setTransactionStatus(`Order ${orderIdToShip} marked as shipped! Transaction successful: ${receipt.transactionHash}`);
          // Update the orders state to reflect the change
          setSellerOrders(prevOrders =>
            prevOrders.map(order =>
              order.orderId === orderIdToShip ? { ...order, status: 1 } : order // Assuming 1 is the enum value for Shipped
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

  const handleRefund = async (disputeId) => {
    if (!contract || !account) return;
    await fetchDisputes();
    await fetchOrders();

    console.log(sellerOrders);
    console.log(disputeId);

    // Find the related order from the current state
    const disputeIdString = String(disputeId);

    const relatedOrder = sellerOrders.find(order => String(order.disputeId) === disputeIdString);

    if (!relatedOrder) {
      console.log("cannot find")
      alert("Related order not found for this dispute.");
      return;
    }
    
    try {
      // pay the same amount as the relatedOrder
      // await contract.methods.refundFromSeller(relatedOrder.orderId).send({ from: account });
      // alert(`Refund initiated for Dispute ID: ${disputeId}, Order ID: ${relatedOrder.orderId}`);

      // fix later 
      // Send the originalAmount of the order as the value
      await contract.methods.refundFromSeller(relatedOrder.orderId).send({
          from: account,
          value: relatedOrder.originalAmount, // NEW: Send the original amount in wei
      });
      alert(`Refund initiated for Dispute ID: ${disputeId}, Order ID: ${relatedOrder.orderId} with amount: ${relatedOrder.originalAmount} wei`); // NEW: Included refunded amount in alert
    
      // Optionally refresh the dispute list
      await fetchDisputes();
      await fetchOrders();
    } catch (error) {
      console.error("Error initiating refund:", error);
      alert(`Error initiating refund: ${error.message}`);
    }
  };

  return (
    <div className="seller-view">
      <h2>Seller Orders</h2>
      {loadingOrders && <p>Loading orders...</p>}
      {errorOrders && <p className="error">{errorOrders}</p>}
      {!loadingOrders && sellerOrders.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Buyer</th>
              <th>Amount (ETH)</th>
              <th>Status</th>
              <th>Dispute ID</th>
              <th>Refund Amount (ETH)</th>
              <th>Delivery Time</th>
              <th>Shipped</th> {/* Additional Column */}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sellerOrders.map(order => {
              console.log("Order ID:", order.orderId, "Status:", Object.values(OrderStatus)[order.status]);
              return (
              <tr key={order.orderId}>
                <td>{order.orderId}</td>
                <td>{order.buyer.substring(0, 6)}...{order.buyer.slice(-4)}</td>
                <td>{web3.utils.fromWei(order.amount, 'ether')}</td>
                <td>{Object.values(OrderStatus)[order.status]}</td>
                <td>{order.disputeId > 0 ? order.disputeId : 'N/A'}</td>
                <td>{order.refundAmount > 0 ? web3.utils.fromWei(order.refundAmount, 'ether') : 'N/A'}</td>
                {/* <td>{order.deliveryConfirmationTime > 0 ? new Date(order.deliveryConfirmationTime * 1000).toLocaleString() : 'N/A'}</td> */}
                <td>
                  {order.deliveryConfirmationTime > 0
                    ? new Date(Number(order.deliveryConfirmationTime) * 1000).toLocaleString()
                    : 'N/A'}
                </td>
                <td>{Object.values(OrderStatus)[order.status]!== 'Created' ? 'Yes' : 'No'}</td>
                <td>
                  {Object.values(OrderStatus)[order.status] === 'Created' && (
                    <button onClick={() => handleMarkShipped(order.orderId)} disabled={loadingOrders}>
                      Mark Shipped
                    </button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      ) : (!loadingOrders && <p>No orders found for this seller.</p>)}

      <h2>Seller Disputes</h2>
      {loadingDisputes && <p>Loading disputes...</p>}
      {errorDisputes && <p className="error">{errorDisputes}</p>}
      {!loadingDisputes && sellerDisputes.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Dispute ID</th>
              <th>Customer</th>
              <th>Reason</th>
              <th>Evidence</th>
              {/* <th>Resolved Status</th> */}
              <th>Reported Time</th>
              <th>Refund</th> {/* Additional Column */}
            </tr>
          </thead>
          <tbody>
            {sellerDisputes.map(dispute => {
              console.log("Order ID:", dispute.orderId, "Status:", Object.values(OrderStatus)[dispute.resolvedStatus])
              // find matching
              const relatedOrder = sellerOrders.find(order => String(order.disputeId) === String(dispute.disputeId));

              return (
              <tr key={dispute.disputeId}>
                <td>{dispute.disputeId}</td>
                <td>{dispute.customer.substring(0, 6)}...{dispute.customer.slice(-4)}</td>
                <td>{dispute.reason}</td>
                <td>{dispute.evidence}</td>
                {/* <td>{Object.values(OrderStatus)[dispute.resolvedStatus]}</td> */}
                {/* <td>{new Date(dispute.reportedTime * 1000).toLocaleString()}</td> */}
                <td>
                  {new Date(Number(dispute.reportedTime) * 1000).toLocaleString()}
                </td>
                <td>
                  {Object.values(OrderStatus)[relatedOrder.status] !== 'Refunded' && (
                    <button onClick={() => {
                      handleRefund(dispute.disputeId);
                    }} disabled={loadingDisputes}>
                      Refund
                    </button>
                  )}
                  {Object.values(OrderStatus)[relatedOrder.status] === 'Refunded' && (
                    <span>Refunded</span>
                  )}
                  {/* {Object.values(OrderStatus)[dispute.resolvedStatus] !== 'Refunded' && (
                    <button onClick={() => {
                      handleRefund(dispute.disputeId);
                    }} disabled={loadingDisputes}>
                      Refund
                    </button>
                  )} */}
                  {/* {Object.values(OrderStatus)[dispute.resolvedStatus] === 'Refunded' && (
                    <span>Refunded</span>
                  )} */}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      ) : (!loadingDisputes && <p>No disputes found for this seller.</p>)}

      {transactionStatus && <p>{transactionStatus}</p>}
    </div>
  );
}

const OrderStatus = {
  0: 'Created',
  1: 'Shipped',
  2: 'Delivered',
  3: 'Disputed',
  4: 'Refunded',
};

export default SellerView;