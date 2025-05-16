import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { HashRouter as Router, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import './App.css';
import BuyerView from './BuyerView';
import SellerView from './SellerView';

// Replace with your contract address and ABI
const contractAddress = '0xB221D20D9ad90A904Ebaaf49b771b26E22EE7443';
const contractABI = [
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"name": "confirmDelivery",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "merchant",
				"type": "address"
			}
		],
		"name": "createOrder",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_owner",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "disputeId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "customer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"name": "DisputeReported",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "disputeId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "enum DeFiPaymentGateway.OrderStatus",
				"name": "resolvedStatus",
				"type": "uint8"
			}
		],
		"name": "DisputeResolved",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"name": "markOrderShipped",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "buyer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "merchant",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "OrderCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"name": "OrderDelivered",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"name": "OrderShipped",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "PaymentSent",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "buyer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "merchant",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Purchase",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "merchant",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "rating",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "comment",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"name": "rateMerchant",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "merchant",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "rating",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "comment",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "rater",
				"type": "address"
			}
		],
		"name": "RatingGiven",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"name": "refundFromSeller",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "RefundInitiated",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "reason",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "evidence",
				"type": "string"
			}
		],
		"name": "reportDispute",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "disputeId",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "allDisputeIds",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "allOrderIds",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "buyerOrders",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "DISPUTE_WINDOW",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "disputeCounter",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "disputes",
		"outputs": [
			{
				"internalType": "address",
				"name": "customer",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "merchant",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "reason",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "evidence",
				"type": "string"
			},
			{
				"internalType": "enum DeFiPaymentGateway.OrderStatus",
				"name": "resolvedStatus",
				"type": "uint8"
			},
			{
				"internalType": "uint256",
				"name": "reportedTime",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "buyer",
				"type": "address"
			}
		],
		"name": "getBuyerOrderIds",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "disputeId",
				"type": "uint256"
			}
		],
		"name": "getDisputeDetails",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "customer",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "merchant",
						"type": "address"
					},
					{
						"internalType": "string",
						"name": "reason",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "evidence",
						"type": "string"
					},
					{
						"internalType": "enum DeFiPaymentGateway.OrderStatus",
						"name": "resolvedStatus",
						"type": "uint8"
					},
					{
						"internalType": "uint256",
						"name": "reportedTime",
						"type": "uint256"
					}
				],
				"internalType": "struct DeFiPaymentGateway.Dispute",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "merchant",
				"type": "address"
			}
		],
		"name": "getMerchantAverageRating",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "averageRating",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"name": "getOrderDetails",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "buyer",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "merchant",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "originalAmount",
						"type": "uint256"
					},
					{
						"internalType": "enum DeFiPaymentGateway.OrderStatus",
						"name": "status",
						"type": "uint8"
					},
					{
						"internalType": "uint256",
						"name": "disputeId",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "refundAmount",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "deliveryConfirmationTime",
						"type": "uint256"
					}
				],
				"internalType": "struct DeFiPaymentGateway.Order",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "seller",
				"type": "address"
			}
		],
		"name": "getSellerDisputeIds",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "seller",
				"type": "address"
			}
		],
		"name": "getSellerOrderIds",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "hasRatedOrder",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "merchantAverageRating",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "merchantRatingCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "merchantRatings",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "rating",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "comment",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "rater",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "orderCounter",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "orders",
		"outputs": [
			{
				"internalType": "address",
				"name": "buyer",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "merchant",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "originalAmount",
				"type": "uint256"
			},
			{
				"internalType": "enum DeFiPaymentGateway.OrderStatus",
				"name": "status",
				"type": "uint8"
			},
			{
				"internalType": "uint256",
				"name": "disputeId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "refundAmount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "deliveryConfirmationTime",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "sellerDisputes",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "sellerOrders",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "userReputation",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

function App() {
  const [web3, setWeb3] = useState(null);
  const [buyerAccount, setBuyerAccount] = useState(null);
  const [sellerAccount, setSellerAccount] = useState(null);
  const [twoAccountsConnected, setTwoAccountsConnected] = useState(false);
  const [createdOrderIds, setCreatedOrderIds] = useState([]); // reset later

  useEffect(() => {
    const loadWeb3 = async () => {
      if (window.ethereum) {
        try {
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);
          // Check if already connected accounts
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length >= 2) {
            setBuyerAccount(accounts[0]);
			console.log("Buyer", accounts[0]);
            setSellerAccount(accounts[1]);
			console.log("Seller", accounts[1]);
            setTwoAccountsConnected(true);
          } else if (accounts.length === 1) {
            setBuyerAccount(accounts[0]);
			setSellerAccount(accounts[0]);
          }
          // Listen for account changes
          window.ethereum.on('accountsChanged', (newAccounts) => {
            if (newAccounts.length >= 2) {
              setBuyerAccount(newAccounts[0]);
              setSellerAccount(newAccounts[1]);
              setTwoAccountsConnected(true);
            } else if (newAccounts.length === 1) {
              setBuyerAccount(newAccounts[0]);
              setSellerAccount(null);
              setTwoAccountsConnected(false);
            } else {
              setBuyerAccount(null);
              setSellerAccount(null);
              setTwoAccountsConnected(false);
            }
          });
          // Listen for network changes
          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });
        } catch (error) {
          console.error("Error loading Web3:", error);
        }
      } else {
        console.log("Non-Ethereum browser detected. You should consider using MetaMask!");
      }
    };

    loadWeb3();
  }, []);

  const handleConnectWallet = async () => {
    if (window.ethereum) {
      try {
        console.log("Attempting to connect wallets...");
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
          params: [{ eth_accounts: {} }] // Request account access
        });
        console.log("Wallets connected:", accounts);
        if (accounts.length >= 2) {
          setBuyerAccount(accounts[0]);
          setSellerAccount(accounts[1]);
          setTwoAccountsConnected(true);
        } else if (accounts.length === 1) {
          setBuyerAccount(null);
          setSellerAccount(null);
          setTwoAccountsConnected(false);
          alert("Please disonnect the account and reconnect two accounts.");
        } else {
          setBuyerAccount(null);
          setSellerAccount(null);
          setTwoAccountsConnected(false);
          alert("No accounts connected.");
        }
      } catch (error) {
        console.error("User denied account access:", error);
      }
    } else {
      alert("MetaMask not detected!");
    }
  };

  // const contractInstance = null;
  const contractInstance = web3 && new web3.eth.Contract(contractABI, contractAddress);

  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <h2>DeFi Payment Demo</h2>

          <button
            className={`connect-wallet-btn ${twoAccountsConnected ? 'connected' : ''}`}
            onClick={handleConnectWallet}
          >
            Connect Wallet
          </button>

          {twoAccountsConnected ? (
            <div className="account-info">
              Buyer: {buyerAccount.substring(0, 6)}...{buyerAccount.slice(-4)}
              <br />
              Seller: {sellerAccount.substring(0, 6)}...{sellerAccount.slice(-4)}
            </div>
          ) : buyerAccount ? (
            <div className="account-info">
              Buyer: {buyerAccount.substring(0, 6)}...{buyerAccount.slice(-4)}
              {sellerAccount === null && <p className="warning">Connect a second account for the seller role.</p>}
            </div>
          ) : (
            <div className="account-info">
              Not connected
            </div>
          )}

          <nav className="sidebar-nav">
            <ul>
              <li>
                <NavLink to={{ pathname: "/COMP4541_Project/buyer", state: { sellerAddress: sellerAccount } }} className="nav-link" activeClassName="active">
                  Buyer
                </NavLink>
              </li>
              <li>
                <NavLink to="/COMP4541_Project/seller" className="nav-link" activeClassName="active">
                  Seller
                </NavLink>
              </li>
            </ul>
          </nav>
        </aside>
        <main className="main-content">
          <Routes>
            <Route
              path="/COMP4541_Project/buyer"
              element={<BuyerView web3={web3} account={buyerAccount} createdOrderIds={createdOrderIds} setCreatedOrderIds={setCreatedOrderIds}  sellerAddress={sellerAccount} contractAddress={contractAddress} contractABI={contractABI} contract={contractInstance} />}
            />
            <Route
              path="/"
              element={
                <div className="welcome-container">
                  <h1>Welcome to the DeFi Payment Demo</h1>
                  <p>Click on the "Buyer" or "Seller" links in the sidebar to utilize the web application.</p>
                </div>
              }
            />
            <Route
              path="/COMP4541_Project"
              element={
                <div className="welcome-container">
                  <h1>Welcome to the DeFi Payment Demo</h1>
                  <p>--Click on the "Buyer" or "Seller" links in the sidebar to utilize the web application--</p>
                </div>
              }
            />
            <Route
              path="/COMP4541_Project/seller"
              element={<SellerView web3={web3} account={sellerAccount} contract={contractInstance} />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;