import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import BuyerView from './BuyerView';
import SellerView from './SellerView';
import AdminView from './AdminView';

// Replace with your contract address and ABI
const contractAddress = 'YOUR_CONTRACT_ADDRESS';
const contractABI = [
  // Your contract ABI here
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
  const [contract, setContract] = useState(null);

  useEffect(() => {
    const loadWeb3 = async () => {
      if (window.ethereum) {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);
          const accounts = await web3Instance.eth.getAccounts();
          setAccount(accounts[0]);
          const deployedContract = new web3Instance.eth.Contract(contractABI, contractAddress);
          setContract(deployedContract);
        } catch (error) {
          console.error("User denied account access or an error occurred:", error);
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
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);
        const accounts = await web3Instance.eth.getAccounts();
        setAccount(accounts[0]);
        const deployedContract = new web3Instance.eth.Contract(contractABI, contractAddress);
        setContract(deployedContract);
      } catch (error) {
        console.error("User denied account access or an error occurred:", error);
      }
    } else {
      alert("MetaMask not detected!");
    }
  };

  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <h2>DeFi Payment Demo</h2>
          {!account ? (
            <button onClick={handleConnectWallet}>Connect Wallet</button>
          ) : (
            <p>Connected: {account.substring(0, 6)}...{account.slice(-4)}</p>
          )}
          <nav>
            <ul>
              <li>
                <Link to="/buyer">Buyer View</Link>
              </li>
              <li>
                <Link to="/seller">Seller View</Link>
              </li>
              <li>
                <Link to="/admin">Admin View</Link>
              </li>
            </ul>
          </nav>
        </aside>
        <main className="main-content">
          <Routes>
            <Route
              path="/buyer"
              element={<BuyerView web3={web3} account={account} contract={contract} />}
            />
            <Route
              path="/seller"
              element={<SellerView web3={web3} account={account} contract={contract} />}
            />
            <Route
              path="/admin"
              element={<AdminView web3={web3} account={account} contract={contract} />}
            />
            <Route path="/" element={<p>Welcome! Please navigate using the sidebar.</p>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;