import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import './App.css';
import BuyerView from './BuyerView';
import SellerView from './SellerView';
import AdminView from './AdminView';

// Replace with your contract address and ABI
const contractAddress = 'YOUR_CONTRACT_ADDRESS';
const contractABI = [
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
        "internalType": "uint256",
        "name": "orderId",
        "type": "uint256"
      }
    ],
    "name": "confirmDelivery",
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
      }
    ],
    "name": "refundFromSeller",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
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
        "name": "disputeId",
        "type": "uint256"
      },
      {
        "internalType": "enum DeFiPaymentGateway.OrderStatus",
        "name": "resolvedStatus",
        "type": "uint8"
      }
    ],
    "name": "resolveDispute",
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
        "internalType": "uint256",
        "name": "orderId",
        "type": "uint256"
      }
    ],
    "name": "markOrderShipped",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const loadWeb3 = async () => {
      if (window.ethereum) {
        try {
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);
          // Check if already connected
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
          // Listen for account changes
          window.ethereum.on('accountsChanged', (newAccounts) => {
            if (newAccounts.length > 0) {
              setAccount(newAccounts[0]);
            } else {
              setAccount(null);
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
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch (error) {
        console.error("User denied account access:", error);
      }
    } else {
      alert("MetaMask not detected!");
    }
  };

  const contractInstance = null; // fix later
  // const contractInstance = web3 && new web3.eth.Contract(contractABI, contractAddress);

  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <h2>DeFi Payment Demo</h2>
          {!account ? (
            <button className="connect-wallet-btn" onClick={handleConnectWallet}>
              Connect Wallet
            </button>
          ) : (
            <div className="account-info">
              Connected: {account.substring(0, 6)}...{account.slice(-4)}
            </div>
          )}
          <nav className="sidebar-nav">
            <ul>
              <li>
                <NavLink to="/buyer" className="nav-link" activeClassName="active">
                  Buyer
                </NavLink>
              </li>
              <li>
                <NavLink to="/seller" className="nav-link" activeClassName="active">
                  Seller
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin" className="nav-link" activeClassName="active">
                  Admin
                </NavLink>
              </li>
            </ul>
          </nav>
        </aside>
        <main className="main-content">
          <Routes>
            <Route
              path="/buyer"
              element={<BuyerView web3={web3} account={account} contractAddress={contractAddress} contractABI={contractABI} />}
            />
            <Route
              path="/seller"
              element={<SellerView web3={web3} account={account} contract={contractInstance} />}
            />
            <Route
              path="/admin"
              element={<AdminView web3={web3} account={account} contract={contractInstance} />}
            />
            <Route path="/" element={<p>Welcome! Please navigate using the sidebar.</p>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;