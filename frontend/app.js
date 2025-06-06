// Toast notification system
let toastCounter = 0

function showToast(message, type = "info", title = null, duration = 5000) {
  const toastContainer = document.getElementById("toastContainer")
  const toastId = `toast-${++toastCounter}`

  // Determine title and icon based on type
  const titles = {
    success: title || "Success",
    error: title || "Error",
    info: title || "Information",
    warning: "Warning",
  }

  const icons = {
    success: "✓",
    error: "✕",
    info: "i",
    warning: "!",
  }

  const toast = document.createElement("div")
  toast.className = `toast ${type}`
  toast.id = toastId
  toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-close" onclick="removeToast('${toastId}')">&times;</div>
        <div class="toast-progress"></div>
    `

  toastContainer.appendChild(toast)

  // Auto remove after duration (except for error messages)
  if (type !== "error" && duration > 0) {
    setTimeout(() => {
      removeToast(toastId)
    }, duration)
  }

  return toastId
}

function removeToast(toastId) {
  const toast = document.getElementById(toastId)
  if (toast) {
    toast.style.animation = "slideOutToast 0.3s ease-out forwards"
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }
}

// Loading overlay functions
function showLoading(message = "Processing...") {
  const overlay = document.getElementById("loadingOverlay")
  const loadingText = document.getElementById("loadingText")
  loadingText.textContent = message
  overlay.classList.remove("hidden")
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay")
  overlay.classList.add("hidden")
}

// Button state management
function setButtonLoading(button, isLoading = true) {
  if (isLoading) {
    button.classList.add("loading")
    button.disabled = true
    button.dataset.originalText = button.textContent
  } else {
    button.classList.remove("loading")
    button.disabled = false
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText
    }
  }
}


// Configuration
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const CONTRACT_ADDRESS = '0x4215b1AccC0cEb03B8EED6C07839Fa3D0B32235c';

// Simplified ABI for the GNaira contract
let CONTRACT_ABI = null

async function loadContractABI() {
    try {
        const response = await fetch('abi.json');
        
        if (!response.ok) {
            throw new Error(`Failed to load ABI: ${response.status} ${response.statusText}`);
        }
        
        const abiData = await response.json();
        CONTRACT_ABI = abiData.abi || abiData; // Support both {abi: [...]} and [...] formats
        
        console.log('Contract ABI loaded successfully');
        
    } catch (error) {
        console.error('Error loading ABI:', error);
        throw new Error('Failed to load contract ABI. Make sure abi.json exists in the same directory.');
    }
}

// Global variables
let provider;
let signer;
let contract;
let userAccount;
let isGovernor = false;
let isAdmin = false;

// DOM elements
const connectWalletBtn = document.getElementById('connectWallet');
const walletInfo = document.getElementById('walletInfo');
const accountAddress = document.getElementById('accountAddress');
const tokenBalance = document.getElementById('tokenBalance');
const refreshBalanceBtn = document.getElementById('refreshBalance');
const statusMessage = document.getElementById('statusMessage');
const mainInterface = document.getElementById('mainInterface');
const networkStatus = document.getElementById('networkStatus');
const governorSections = document.getElementById('governorSections');
const adminSections = document.getElementById('adminSections');
const transferBtn = document.getElementById('transferBtn');


// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load ABI from abi.json
        showToast('Loading contract ABI...', 'info');
        await loadContractABI();
        showToast('ABI Loaded successfully', 'success');
        
        // Check if MetaMask is installed
        if (typeof window.ethereum !== 'undefined') {
            console.log('MetaMask detected');
            
            // Check if already connected
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await connectWallet();
            }
            
            // Listen for account changes
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
        } else {
            showToast('MetaMask not detected. Please install MetaMask to use this application.', 'error');
        }
        
        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showToast(`Failed to load application: ${error.message}`, 'error');
    }
});

// Event listeners setup
function setupEventListeners() {
    connectWalletBtn.addEventListener('click', connectWallet);
    refreshBalanceBtn.addEventListener('click', refreshBalance);

    // Add to MetaMask button
    document.getElementById('addToMetaMask').addEventListener('click', showAddTokenModal);

    // Close modal button
    document.querySelector(".close-modal").addEventListener("click", closeAddTokenModal)
    
    // Transfer form
    document.getElementById('transferForm').addEventListener('submit', handleTransfer);
    
    // Transfer From form
    // document.getElementById('transferFromForm').addEventListener('submit', handleTransferFrom);
    
    // Approve form
    // document.getElementById('approveForm').addEventListener('submit', handleApprove);
    
    // Mint form
    document.getElementById('mintForm').addEventListener('submit', handleMint);
    
    // Burn form
    document.getElementById('burnForm').addEventListener('submit', handleBurn);
    
    // Blacklist buttons
    document.getElementById('blacklistBtn').addEventListener('click', () => handleBlacklist(true));
    document.getElementById('unblacklistBtn').addEventListener('click', () => handleBlacklist(false));
    
    // Role management buttons
    document.getElementById('grantRoleBtn').addEventListener('click', () => handleRoleManagement(true));
    document.getElementById('revokeRoleBtn').addEventListener('click', () => handleRoleManagement(false));
}

// Connect to MetaMask wallet
async function connectWallet() {
    try {
        if (!CONTRACT_ABI) {
            throw new Error("Contract ABI not loaded. Please refresh the page.")
        }

        setButtonLoading(connectWalletBtn, true)
        showLoading("Connecting to MetaMask...")
        
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        // Check network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== SEPOLIA_CHAIN_ID) {
            showLoading("Switching to Sepolia network...")
            await switchToSepolia()
        }
        
        // Initialize ethers
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAccount = accounts[0];
        
        // Initialize contract
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        setButtonLoading(connectWalletBtn, false)
        
        // Update UI
        accountAddress.textContent = userAccount;
        connectWalletBtn.textContent = 'Connected';
        connectWalletBtn.disabled = true;
        walletInfo.classList.remove('hidden');
        mainInterface.classList.remove('hidden');
        networkStatus.textContent = 'Sepolia Testnet';
        
        // Pre-fill transfer from spender with current account
        // document.getElementById('transferFromSpender').value = userAccount;
        
        // Load balance and check roles
        showLoading("Loading account information...")
        await refreshBalance()
        await checkUserRoles()

        hideLoading()
        
        showToast('Successfully connected to MetaMask!', 'success');
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        setButtonLoading(connectWalletBtn, false)
        showToast(`Failed to connect: ${error.message}`, 'error');
    } finally {
    }
}

// Switch to Sepolia network
async function switchToSepolia() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: SEPOLIA_CHAIN_ID,
                        chainName: 'Sepolia Testnet',
                        nativeCurrency: {
                            name: 'Ethereum',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: ['https://sepolia.infura.io/v3/'],
                        blockExplorerUrls: ['https://sepolia.etherscan.io/']
                    }]
                });
            } catch (addError) {
                showToast("Failed to add Sepolia network to MetaMask.", "error")
                throw new Error('Failed to add Sepolia network', addError);
            }
        } else {
            showToast("Failed to switch to Sepolia network.", "error")
            throw switchError;
        }
    }
}

// Refresh token balance
async function refreshBalance() {
    try {
        if (!contract || !userAccount) return;

        if (refreshBalanceBtn) {
            setButtonLoading(refreshBalanceBtn, true)
        }
        
        const balance = await contract.balanceOf(userAccount);
        const formattedBalance = ethers.formatUnits(balance, 18);
        tokenBalance.textContent = parseFloat(formattedBalance).toFixed(6);


        if (refreshBalanceBtn) {
            showToast("Balance updated successfully", "success", null, 2000)
        }
        
    } catch (error) {
        console.error('Error fetching balance:', error);
        showToast(`Failed to fetch balance: ${error.message}`, 'error');
    } finally {
        setButtonLoading(refreshBalanceBtn, false)
    }
}

// Check user roles (governor/admin)
async function checkUserRoles() {
    try {
        if (!contract || !userAccount) return;
        
        // Get role constants
        const governorRole = await contract.GOVERNOR();
        const adminRole = await contract.DEFAULT_ADMIN_ROLE();
        
        // Check if user has roles
        isGovernor = await contract.hasRole(governorRole, userAccount);
        isAdmin = await contract.hasRole(adminRole, userAccount);
        
        // Show/hide sections based on roles
        if (isGovernor) {
            governorSections.classList.remove('hidden');
        }
        
        if (isAdmin) {
            adminSections.classList.remove('hidden');
        }
        
        console.log(`User roles - Governor: ${isGovernor}, Admin: ${isAdmin}`);
        
    } catch (error) {
        console.error('Error checking roles:', error);
        // Don't show error to user as roles might not be implemented
    }
}



// Add G-Naira token to MetaMask
// async function addTokenToMetaMask() {
//     try {
//         if (!window.ethereum) {
//             throw new Error('MetaMask not detected');
//         }
        
//         if (!contract) {
//             throw new Error('Contract not initialized. Please connect your wallet first.');
//         }
        
//         showStatus('Adding G-NGN token to MetaMask...', 'info');
        
//         // Get token details from the contract
//         const tokenSymbol = await contract.symbol();
//         const tokenDecimals = await contract.decimals();
//         const tokenName = await contract.name();
//         const tokenImage = 'https://i.ibb.co/Df6THFFy/g-naira-icon-1.png';

//         console.log(tokenImage)
//         // Request to add token to MetaMask
//         const wasAdded = await window.ethereum.request({
//             method: 'wallet_watchAsset',
//             params: {
//                 type: 'ERC20',
//                 options: {
//                     address: CONTRACT_ADDRESS,
//                     symbol: tokenSymbol,
//                     decimals: tokenDecimals,
//                     name: tokenName,
//                     image: tokenImage
//                 },
//             },
//         });
        
//         if (wasAdded) {
//             showStatus('G-NGN token successfully added to MetaMask!', 'success');
//         } else {
//             showStatus('Token addition was cancelled by user.', 'info');
//         }
        
//     } catch (error) {
//         console.log(error.code)
//         console.error('Error adding token to MetaMask:', error);
        
//         // Handle specific error cases
//         if (error.code === 4001) {
//             showStatus('Token addition was rejected by user.', 'info');
//         } else if (error.message.includes('User rejected')) {
//             showStatus('Token addition was rejected by user.', 'info');
//         } else {
//             showStatus(`Failed to add token to MetaMask: ${error.message}`, 'error');
//         }
//     }
// }

// Show add token modal
function showAddTokenModal() {
  const modal = document.getElementById("addTokenModal")
  modal.classList.remove("hidden")

  // Close modal when clicking outside
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeAddTokenModal()
    }
  })

  // Close modal with Escape key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAddTokenModal()
    }
  })
}

// Close add token modal
function closeAddTokenModal() {
  const modal = document.getElementById("addTokenModal")
  modal.classList.add("hidden")
}


// Copy text to clipboard
async function copyToClipboard(elementId) {
  try {
    const element = document.getElementById(elementId)
    const text = element.value

    // Use the modern Clipboard API if available
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers
      element.select()
      element.setSelectionRange(0, 99999) // For mobile devices
      document.execCommand("copy")
    }

    // Visual feedback
    const copyBtn = element.nextElementSibling
    const originalText = copyBtn.textContent
    copyBtn.textContent = "Copied!"
    copyBtn.classList.add("copied")

    setTimeout(() => {
      copyBtn.textContent = originalText
      copyBtn.classList.remove("copied")
    }, 2000)

    showToast("Copied to clipboard!", "success")
  } catch (error) {
    console.error("Failed to copy text:", error)
    showToast("Failed to copy. Please select and copy manually.", "error")
  }
}



// Handle transfer
async function handleTransfer(event) {
    event.preventDefault();
    
    try {
        const recipient = document.getElementById('transferRecipient').value;
        const amount = document.getElementById('transferAmount').value;
        
        if (!recipient || !amount) {
            throw new Error('Please fill in all fields');
        }
        
        setButtonLoading(transferBtn, true)
        showLoading("Preparing transfer...")
        
        const amountWei = ethers.parseUnits(amount, 18);
        const tx = await contract.transfer(recipient, amountWei);
        
        showLoading("Transaction submitted. Waiting for confirmation...")
        await tx.wait();
        
        hideLoading()
        showToast(`Successfully transferred ${amount} gNGN to ${recipient}`, "success")
        await refreshBalance();
        
        // Clear form
        document.getElementById('transferForm').reset();
        
    } catch (error) {
        console.error('Transfer error:', error);
        hideLoading()
        showToast(`Transfer failed: ${error.message}`, "error")
    } finally {
        setButtonLoading(transferBtn, false)
    }
}

// Handle transfer from
// async function handleTransferFrom(event) {
//     event.preventDefault();
    
//     try {
//         const owner = document.getElementById('transferFromOwner').value;
//         const spender = document.getElementById('transferFromSpender').value;
//         const amount = document.getElementById('transferFromAmount').value;
        
//         if (!owner || !spender || !amount) {
//             throw new Error('Please fill in all fields');
//         }
        
//         showStatus('Processing transfer from...', 'info');
        
//         const amountWei = ethers.parseUnits(amount, 18);
//         const tx = await contract.transferFrom(owner, spender, amountWei);
        
//         showStatus('Transaction submitted. Waiting for confirmation...', 'info');
//         await tx.wait();
        
//         showStatus(`Successfully transferred ${amount} gNGN from ${owner} to ${spender}`, 'success');
//         await refreshBalance();
        
//         // Clear form
//         document.getElementById('transferFromForm').reset();
//         document.getElementById('transferFromSpender').value = userAccount; // Re-fill spender
        
//     } catch (error) {
//         console.error('Transfer from error:', error);
//         showStatus(`Transfer from failed: ${error.message}`, 'error');
//     }
// }

// Handle approve
// async function handleApprove(event) {
//     event.preventDefault();
    
//     try {
//         const spender = document.getElementById('approveSpender').value;
//         const amount = document.getElementById('approveAmount').value;
        
//         if (!spender || !amount) {
//             throw new Error('Please fill in all fields');
//         }
        
//         showStatus('Processing approval...', 'info');
        
//         const amountWei = ethers.parseUnits(amount, 18);
//         const tx = await contract.approve(spender, amountWei);
        
//         showStatus('Transaction submitted. Waiting for confirmation...', 'info');
//         await tx.wait();
        
//         showStatus(`Successfully approved ${amount} gNGN for ${spender}`, 'success');
        
//         // Clear form
//         document.getElementById('approveForm').reset();
        
//     } catch (error) {
//         console.error('Approve error:', error);
//         showStatus(`Approval failed: ${error.message}`, 'error');
//     }
// }

// Handle mint (governor only)
async function handleMint(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('button[type="submit"]')
    
    try {
        const to = document.getElementById('mintTo').value;
        const amount = document.getElementById('mintAmount').value;
        
        if (!to || !amount) {
            throw new Error('Please fill in all fields');
        }
        
        setButtonLoading(submitBtn, true)
        showLoading("Preparing mint transaction...")
        
        const amountWei = ethers.parseUnits(amount, 18);
        const tx = await contract.mint(to, amountWei);
        
        showLoading("Transaction submitted. Waiting for confirmation...")
        await tx.wait();
        
        hideLoading()
        showToast(`Successfully minted ${amount} gNGN to ${to}`, "success")
        await refreshBalance();
        
        // Clear form
        document.getElementById('mintForm').reset();
        
    } catch (error) {
        console.error('Mint error:', error);
        hideLoading()
        showToast(`Minting failed: ${error.message}`, "error")
    } finally {
        setButtonLoading(submitBtn, false)
    }
}

// Handle burn (governor only)
async function handleBurn(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('button[type="submit"]')
    
    try {
        const from = document.getElementById('burnFrom').value;
        const amount = document.getElementById('burnAmount').value;
        
        if (!from || !amount) {
            throw new Error('Please fill in all fields');
        }
        
        setButtonLoading(submitBtn, true)
        showLoading("Preparing burn transaction...")
        
        const amountWei = ethers.parseUnits(amount, 18);
        const tx = await contract.burn(from, amountWei);
        
        showLoading("Transaction submitted. Waiting for confirmation...")
        await tx.wait();
        
        hideLoading()
        showToast(`Successfully burned ${amount} gNGN from ${from}`, "success")
        await refreshBalance();
        
        // Clear form
        document.getElementById('burnForm').reset();
        
    } catch (error) {
        console.error('Burn error:', error);
        hideLoading()
        showToast(`Burning failed: ${error.message}`, "error")
    } finally {
        setButtonLoading(submitBtn, false)
    }
}

// Handle blacklist/unblacklist (governor only)
async function handleBlacklist(isBlacklist) {
    event.preventDefault()

    try {
        const address = document.getElementById('blacklistAddress').value;
        
        if (!address) {
            throw new Error('Please enter an address');
        }
        

        if (isBlacklist) {
            action = 'blacklisting'
            submitBtn = document.getElementById('blacklistBtn')
        } else {
            action = 'unblacklisting'
            submitBtn = document.getElementById('unblacklistBtn')
        }

        setButtonLoading(submitBtn, true)
        
        showLoading("Preparing blacklist transaction...")
        
        const tx = isBlacklist 
            ? await contract.blacklistAddress(address)
            : await contract.unblacklistAddress(address);
        
        showLoading("Transaction submitted. Waiting for confirmation...")
        await tx.wait();
        
        hideLoading()
        showToast(`Successfully ${action.slice(0, -3)}ed ${address}`, "success")
                
        // Clear form
        document.getElementById('blacklistAddress').value = '';
        
    } catch (error) {
        console.error('Blacklist error:', error);
        hideLoading()
        showToast(`Blacklist operation failed: ${error.message}`, "error")
    } finally {
        setButtonLoading(submitBtn, false)
    }
}

// Handle role management (admin only)
async function handleRoleManagement(isGrant) {
    event.preventDefault()

    let submitBtn;

    if (isGrant) {
        submitBtn = document.getElementById('grantRoleBtn');
    } else {
        submitBtn = document.getElementById('revokeRoleBtn');
    }

    try {
        const roleId = document.getElementById('roleId').value;
        const address = document.getElementById('roleAddress').value;
        
        if (!roleId || !address) {
            throw new Error('Please fill in all fields');
        }
        
        const action = isGrant ? 'granting' : 'revoking';
        setButtonLoading(submitBtn, true)
        showLoading("Preparing role management transaction...")
        
        const tx = isGrant 
            ? await contract.grantRole(roleId, address)
            : await contract.revokeRole(roleId, address);
        
        showLoading("Transaction submitted. Waiting for confirmation...")
        await tx.wait();
        
        hideLoading()
        showToast(`Successfully ${action.slice(0, -3)}ed role for ${address}`, 'success');
        
        // Clear form
        document.getElementById('roleForm').reset();
        
    } catch (error) {
        console.error('Role management error:', error);
        hideLoading()
        showToast(`Role management failed: ${error.message}`, "error")
    } finally {
        setButtonLoading(submitBtn, false)
    }
}

// Handle account changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected
        location.reload();
    } else if (accounts[0] !== userAccount) {
        // User switched accounts
        location.reload();
    }
}

// Handle chain changes
function handleChainChanged(chainId) {
    // Reload the page when chain changes
    location.reload();
}


// Utility function to format address for display
function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}