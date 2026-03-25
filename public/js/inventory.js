// /public/js/inventory.js

let globalIngredients = [];

// --- Navigation & UI Logic ---
export function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

export function toggleModal(id) {
    document.getElementById(id).classList.toggle('hidden');
}

// --- API Integration: Ingredients ---
export async function fetchIngredients() {
    try {
        const res = await fetch('/api/inventory/ingredients'); 
        const result = await res.json();
        const tableBody = document.getElementById('ingredients-table-body');
        tableBody.innerHTML = '';

        if(result.success) {
            globalIngredients = result.data; // Save globally for dropdowns
            
            result.data.forEach(item => {
                const isLow = item.stock_level <= item.low_stock_threshold;
                
                // Calculate if expiring soon (within 7 days)
                let expiryBadge = '<span style="color: var(--gray-500);">N/A</span>';
                if (item.expiry_date) {
                    const expDate = new Date(item.expiry_date);
                    const today = new Date();
                    const diffTime = expDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    const batchQtyInfo = item.oldest_batch_qty ? ` (${item.oldest_batch_qty}${item.unit})` : '';

                    if (diffDays < 0) {
                        expiryBadge = `<span class="badge badge-expired">EXPIRED${batchQtyInfo}</span>`;
                    } else if (diffDays <= 7) {
                        expiryBadge = `<span class="badge badge-warning">In ${diffDays} days${batchQtyInfo}</span>`;
                    } else {
                        expiryBadge = `<span>${expDate.toLocaleDateString()}${batchQtyInfo}</span>`;
                    }
                }

                const row = `
                    <tr class="${isLow ? 'row-low-stock' : ''}">
                        <td>${item.ingredient_name}</td>
                        <td>${item.stock_level} ${item.unit}</td>
                        <td>$${item.cost_per_unit.toFixed(2)}</td>
                        <td style="color: var(--gray-500);">${item.supplier || 'N/A'}</td>
                        <td>
                            <span class="badge ${isLow ? 'badge-low' : 'badge-ok'}">
                                ${isLow ? 'LOW STOCK' : 'OK'}
                            </span>
                        </td>
                        <td>${expiryBadge}</td>
                        <td style="text-align: center;">
                            <button onclick="openRestockModal(${item.ingredient_id}, '${item.ingredient_name.replace(/'/g, "\\'")}', '${item.unit}')" class="btn" style="background-color: var(--blue-100); color: var(--blue-700); padding: 0.25rem 0.5rem; margin-right: 0.5rem; border-radius: 4px;">
                                <i class="fas fa-plus" style="margin-right: 0.3rem;"></i> Add
                            </button>
                            <button onclick="deleteIng(${item.ingredient_id})" class="btn-danger-text">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', row);
            });

            updateDropdowns(); // Update all selects whenever stock changes
        }
    } catch (err) {
        console.error("Failed to fetch ingredients", err);
    }
}

export async function handleAddIngredient(event) {
    event.preventDefault();
    
    const payload = {
        ingredient_name: document.getElementById('new_name').value,
        stock_level: parseFloat(document.getElementById('new_stock').value),
        unit: document.getElementById('new_unit').value,
        cost_per_unit: parseFloat(document.getElementById('new_cost').value),
        low_stock_threshold: parseFloat(document.getElementById('new_threshold').value),
        supplier: document.getElementById('new_supplier').value,
        expiry_date: document.getElementById('new_expiry').value 
    };

    try {
        const res = await fetch('/api/inventory/ingredients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if(data.success) {
            toggleModal('ingredient-modal');
            event.target.reset();
            fetchIngredients();
        } else {
            alert('Error: ' + data.message);
        }
    } catch(err) {
        console.error(err);
    }
}

export async function deleteIng(id) {
    if(confirm("Are you sure you want to delete this ingredient?")) {
        try {
            const res = await fetch('/api/inventory/ingredients/' + id, { method: 'DELETE' });
            const data = await res.json();
            if(data.success) {
                fetchIngredients();
            } else {
                alert('Error: ' + data.message);
            }
        } catch(err) {
            console.error(err);
        }
    }
}

// --- Dynamic Recipe Builder Logic ---

// Populate all selects (recipe rows + wastage form)
function updateDropdowns() {
    const optionsHtml = globalIngredients.map(ing => 
        `<option value="${ing.ingredient_id}" data-cost="${ing.cost_per_unit}">${ing.ingredient_name} (${ing.unit})</option>`
    ).join('');

    // Update existing recipe rows
    document.querySelectorAll('.recipe-ingredient-select').forEach(select => {
        const currentVal = select.value;
        select.innerHTML = `<option value="" disabled selected>Select Ingredient...</option>` + optionsHtml;
        select.value = currentVal; // preserve selection if possible
    });

    // Update Wastage Dropdown
    const wastageSelect = document.getElementById('wastage_ingredient');
    if(wastageSelect) {
        wastageSelect.innerHTML = `<option value="" disabled selected>Select Ingredient...</option>` + optionsHtml;
    }
}

export function addIngredientRow() {
    const container = document.getElementById('recipe-ingredients-list');
    const optionsHtml = globalIngredients.map(ing => 
        `<option value="${ing.ingredient_id}" data-cost="${ing.cost_per_unit}">${ing.ingredient_name} (${ing.unit})</option>`
    ).join('');

    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.innerHTML = `
        <select class="form-select recipe-ingredient-select" onchange="calculatePreview()" required style="flex: 2;">
            <option value="" disabled selected>Select Ingredient...</option>
            ${optionsHtml}
        </select>
        <input type="number" placeholder="Qty" class="form-input" step="0.01" min="0" oninput="calculatePreview()" required style="flex: 1;">
        <button type="button" onclick="this.parentElement.remove(); calculatePreview();" style="background:none; border:none; color:var(--red-500); cursor:pointer; font-size:1.5rem;">&times;</button>
    `;
    container.appendChild(row);
}

// Live calculation without hitting the backend
export function calculatePreview() {
    let totalCost = 0;
    const rows = document.querySelectorAll('.ingredient-row');
    
    rows.forEach(row => {
        const select = row.querySelector('select');
        const qtyInput = row.querySelector('input[type="number"]');
        
        if (select.value && qtyInput.value) {
            const costPerUnit = parseFloat(select.options[select.selectedIndex].getAttribute('data-cost'));
            const qty = parseFloat(qtyInput.value);
            totalCost += (costPerUnit * qty);
        }
    });

    const sellingPrice = parseFloat(document.getElementById('selling_price').value) || 0;
    
    document.getElementById('cost-preview').innerText = `$${totalCost.toFixed(2)}`;
    
    // Profit Margin Calculation: ((Selling Price - Cost) / Selling Price) * 100
    const marginEl = document.getElementById('margin-preview');
    if (sellingPrice > 0) {
        const margin = ((sellingPrice - totalCost) / sellingPrice) * 100;
        marginEl.innerText = `${margin.toFixed(1)}%`;
        marginEl.style.color = margin >= 0 ? 'var(--green-600)' : 'var(--red-600)';
    } else {
        marginEl.innerText = '0%';
        marginEl.style.color = 'var(--gray-500)';
    }
}

export async function handleSaveRecipe(event) {
    event.preventDefault();
    
    const rows = document.querySelectorAll('.ingredient-row');
    const ingredientsArr = [];
    rows.forEach(row => {
        const idInput = row.querySelector('select').value;
        const qtyInput = row.querySelector('input').value;
        if(idInput && qtyInput) {
            ingredientsArr.push({
                ingredient_id: parseInt(idInput),
                quantity: parseFloat(qtyInput)
            });
        }
    });

    const payload = {
        dish_name: document.getElementById('dish_name').value,
        category: document.getElementById('dish_category').value,
        selling_price: parseFloat(document.getElementById('selling_price').value),
        estimated_time: parseInt(document.getElementById('estimated_time').value),
        ingredients: ingredientsArr
    };

    try {
        const res = await fetch('/api/inventory/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(data.success) {
            alert('Recipe saved successfully!');
            event.target.reset();
            document.getElementById('recipe-ingredients-list').innerHTML = '';
            addIngredientRow(); 
            calculatePreview();
        } else {
            alert('Error: ' + data.message);
        }
    } catch(err) {
        console.error(err);
    }
}

// --- API Integration: Wastage ---
export async function handleLogWastage(event) {
    event.preventDefault();
    
    const payload = {
        ingredient_id: document.getElementById('wastage_ingredient').value,
        quantity: parseFloat(document.getElementById('wastage_qty').value),
        reason: document.getElementById('wastage_reason').value
    };

    try {
        const res = await fetch('/api/inventory/wastage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(data.success) {
            alert('Wastage logged! Stock has been updated.');
            event.target.reset();
            fetchIngredients(); // Refresh the stock table
        } else {
            alert('Error: ' + data.message);
        }
    } catch(err) {
        console.error(err);
    }
}

export function openRestockModal(id, name, unit) {
    document.getElementById('restock_id').value = id;
    document.getElementById('restock-ing-name').innerText = name;
    document.getElementById('restock-unit').innerText = unit;
    document.getElementById('restock_qty').value = '';
    toggleModal('restock-modal');
}

export async function handleRestock(event) {
    event.preventDefault();
    const id = document.getElementById('restock_id').value;
    const qty = document.getElementById('restock_qty').value;
    const expiryDate = document.getElementById('restock_expiry').value;

    try {
        const res = await fetch(`/api/inventory/ingredients/${id}/restock`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: qty, expiry_date: expiryDate })
        });
        const data = await res.json();
        
        if(data.success) {
            toggleModal('restock-modal');
            fetchIngredients(); // Automatically re-fetches and sorts!
        } else {
            alert('Error: ' + data.message);
        }
    } catch(err) {
        console.error(err);
    }
}

// --- Attach to Window ---
window.showSection = showSection;
window.toggleModal = toggleModal;
window.deleteIng = deleteIng;
window.addIngredientRow = addIngredientRow;
window.calculatePreview = calculatePreview;
window.openRestockModal = openRestockModal;

document.addEventListener('DOMContentLoaded', () => {
    fetchIngredients();
    
    // Attach form submit listeners
    document.getElementById('add-ingredient-form')?.addEventListener('submit', handleAddIngredient);
    document.getElementById('restock-form')?.addEventListener('submit', handleRestock);
    document.getElementById('recipe-form')?.addEventListener('submit', handleSaveRecipe);
    document.getElementById('wastage-form')?.addEventListener('submit', handleLogWastage);
    
    // Live update for selling price changes
    document.getElementById('selling_price')?.addEventListener('input', calculatePreview);
});