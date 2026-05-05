// Database of popular cards for the dropdown
const popularCardsDatabase = [
  "Amex Platinum", "Amex Gold", "Amex Green", "Amex Blue Cash Preferred", 
  "Chase Sapphire Reserve", "Chase Sapphire Preferred", "Chase Freedom Unlimited", "Chase Freedom Flex",
  "Capital One Venture X", "Capital One Venture", "Capital One SavorOne", "Capital One Quicksilver",
  "Citi Double Cash", "Citi Custom Cash", "Citi Premier",
  "Discover it Cash Back", "Discover it Miles",
  "Apple Card", "Bilt Mastercard", "Wells Fargo Active Cash", "Custom/Other Card"
];

// Initial Blank State
const defaultData = {
  assets: { debit: 0, savings: 0 },
  liabilities: { creditCards: {} }, // Starts empty! User adds cards.
  transactions: []
};

// Initialize App State from LocalStorage or Default
let appData = JSON.parse(localStorage.getItem('financeData')) || defaultData;

// DOM Elements
const netWorthDisplay = document.getElementById('net-worth-display');
const assetsDisplay = document.getElementById('assets-display');
const liabilitiesDisplay = document.getElementById('liabilities-display');

const availableCardsDropdown = document.getElementById('available-cards-dropdown');
const addCardBtn = document.getElementById('add-card-btn');

const debitInput = document.getElementById('debit-input');
const savingsInput = document.getElementById('savings-input');
const ccInputsContainer = document.getElementById('cc-inputs-container');

const balanceForm = document.getElementById('balance-form');
const transactionForm = document.getElementById('transaction-form');
const transactionMethodSelect = document.getElementById('txn-method');
const transactionList = document.getElementById('transaction-list');

// Initialize the Application
function init() {
  populateCardDatabase();
  renderDynamicForms();
  updateDashboard();
  renderTransactions();
}

// Save to LocalStorage
function saveData() {
  localStorage.setItem('financeData', JSON.stringify(appData));
  updateDashboard();
}

// Populate the "Add Card" Dropdown
function populateCardDatabase() {
  popularCardsDatabase.sort().forEach(card => {
    const option = document.createElement('option');
    option.value = card;
    option.innerText = card;
    availableCardsDropdown.appendChild(option);
  });
}

// Add Card to User's Wallet
addCardBtn.addEventListener('click', () => {
  const selectedCard = availableCardsDropdown.value;
  
  // Check if they already added it
  if (appData.liabilities.creditCards.hasOwnProperty(selectedCard)) {
    alert('This card is already in your wallet!');
    return;
  }

  // Add to app data with a $0 balance
  appData.liabilities.creditCards[selectedCard] = 0;
  saveData();
  renderDynamicForms(); // Refresh the UI
});

// Render Inputs and Dropdowns based on User's Wallet
function renderDynamicForms() {
  debitInput.value = appData.assets.debit;
  savingsInput.value = appData.assets.savings;

  // Clear existing dynamic inputs
  ccInputsContainer.innerHTML = '';
  transactionMethodSelect.innerHTML = '<option value="Debit">Debit / Checking</option>';

  const userCards = Object.keys(appData.liabilities.creditCards);

  if (userCards.length === 0) {
    ccInputsContainer.innerHTML = '<p class="empty-state">No credit cards in wallet. Add some above!</p>';
    return;
  }

  userCards.forEach(card => {
    // 1. Build Balance Input
    const label = document.createElement('label');
    label.innerText = `${card} Balance ($)`;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.value = appData.liabilities.creditCards[card];
    input.dataset.cardName = card;
    input.className = 'cc-input';
    
    ccInputsContainer.appendChild(label);
    ccInputsContainer.appendChild(input);

    // 2. Add to Transaction Dropdown
    const option = document.createElement('option');
    option.value = card;
    option.innerText = card;
    transactionMethodSelect.appendChild(option);
  });
}

// Handle Balance Updates
balanceForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  appData.assets.debit = parseFloat(debitInput.value) || 0;
  appData.assets.savings = parseFloat(savingsInput.value) || 0;

  const ccInputs = document.querySelectorAll('.cc-input');
  ccInputs.forEach(input => {
    appData.liabilities.creditCards[input.dataset.cardName] = parseFloat(input.value) || 0;
  });

  saveData();
  alert('Balances Updated Successfully!');
});

// Calculate and Update Dashboard
function updateDashboard() {
  const totalAssets = parseFloat(appData.assets.debit) + parseFloat(appData.assets.savings);
  
  let totalLiabilities = 0;
  for (let card in appData.liabilities.creditCards) {
    totalLiabilities += parseFloat(appData.liabilities.creditCards[card]);
  }

  const netWorth = totalAssets - totalLiabilities;

  netWorthDisplay.innerText = formatCurrency(netWorth);
  netWorthDisplay.className = netWorth >= 0 ? 'positive' : 'negative';
  
  assetsDisplay.innerText = formatCurrency(totalAssets);
  liabilitiesDisplay.innerText = formatCurrency(totalLiabilities);
}

// Handle New Transactions
transactionForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const newTxn = {
    id: Date.now(),
    name: document.getElementById('txn-name').value,
    amount: parseFloat(document.getElementById('txn-amount').value),
    category: document.getElementById('txn-category').value,
    method: document.getElementById('txn-method').value,
    points: document.getElementById('txn-points').value,
    optimal: document.getElementById('txn-optimal').value,
    date: new Date().toLocaleDateString()
  };

  appData.transactions.unshift(newTxn);
  
  // Automatically adjust balances based on transaction
  if (newTxn.method !== 'Debit') {
    appData.liabilities.creditCards[newTxn.method] += newTxn.amount;
  } else {
    appData.assets.debit -= newTxn.amount;
  }

  saveData();
  renderDynamicForms();
  renderTransactions();
  transactionForm.reset();
});

// Render Transactions to Table
function renderTransactions() {
  transactionList.innerHTML = '';
  
  if (appData.transactions.length === 0) {
    transactionList.innerHTML = '<tr><td colspan="7" class="empty-state">No transactions logged yet.</td></tr>';
    return;
  }

  appData.transactions.forEach(txn => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${txn.name} <br><small>${txn.date}</small></td>
      <td>${formatCurrency(txn.amount)}</td>
      <td><strong>${txn.method}</strong></td>
      <td>${txn.category}</td>
      <td>${txn.points || '-'}</td>
      <td>${txn.optimal === 'Yes' ? '✅' : '❌'}</td>
      <td><button class="delete-btn" onclick="deleteTransaction(${txn.id})">Del</button></td>
    `;
    transactionList.appendChild(tr);
  });
}

// Delete a Transaction
window.deleteTransaction = function(id) {
  appData.transactions = appData.transactions.filter(txn => txn.id !== id);
  saveData();
  renderTransactions();
}

// Utility: Format Currency
function formatCurrency(num) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

// Run app
init();