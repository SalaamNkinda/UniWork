// /public/js/inventoryController.js

// --- Navigation & UI Logic ---
export function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

export function toggleModal(id) {
    const m = document.getElementById(id);
    m.classList.toggle('hidden');
}

export function addIngredientRow() {
    const container = document.getElementById('recipe-ingredients-list');
    const row = `
        <div class="ingredient-row">
            <input type="number" placeholder="Ingredient ID" class="form-input" required>
            <input type="number" placeholder="Qty" class="form-input" step="0.1" required>
            <button type="button" onclick="this.parentElement.remove()">×</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', row);
}

// --- API Integration: Ingredients ---
export async function fetchIngredients() {
    try {
        const res = await fetch('/api/inventory/ingredients'); 
        const result = await res.json();
        const tableBody = document.getElementById('ingredients-table-body');
        tableBody.innerHTML = '';

        if(result.success) {
            result.data.forEach(item => {
                const isLow = item.stock_level <= item.low_stock_threshold;
                const row = `
                    <tr class="${isLow ? 'row-low-stock' : ''}">
                        <td>${item.ingredient_name} (ID: ${item.ingredient_id})</td>
                        <td>${item.stock_level} ${item.unit}</td>
                        <td>$${item.cost_per_unit}</td>
                        <td style="color: var(--gray-500);">${item.supplier || 'N/A'}</td>
                        <td>
                            <span class="badge ${isLow ? 'badge-low' : 'badge-ok'}">
                                ${isLow ? 'LOW STOCK' : 'OK'}
                            </span>
                        </td>
                        <td style="text-align: center;">
                            <button onclick="deleteIng(${item.ingredient_id})" class="btn-danger-text">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', row);
            });
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
        supplier: document.getElementById('new_supplier').value
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
            event.target.reset(); // Clear the form
            fetchIngredients(); // Refresh table
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
                fetchIngredients(); // Refresh table
            } else {
                alert('Error: ' + data.message);
            }
        } catch(err) {
            console.error(err);
        }
    }
}

// --- API Integration: Recipe Logic ---
export async function handleSaveRecipe(event) {
    event.preventDefault();
    
    // Gather ingredients from dynamic rows
    const rows = document.querySelectorAll('.ingredient-row');
    const ingredientsArr = [];
    rows.forEach(row => {
        const idInput = row.children[0].value;
        const qtyInput = row.children[1].value;
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
            document.getElementById('cost-preview').innerText = '$' + data.data.production_cost;
            document.getElementById('margin-preview').innerText = 'Calculated!';
            event.target.reset();
            document.getElementById('recipe-ingredients-list').innerHTML = '';
            addIngredientRow(); // Add an empty row back
        } else {
            alert('Error: ' + data.message);
        }
    } catch(err) {
        console.error(err);
    }
}

// --- Initialization & Global Attachments ---

// Attach functions to the window object so inline HTML onclick handlers can find them
window.showSection = showSection;
window.toggleModal = toggleModal;
window.deleteIng = deleteIng;
window.addIngredientRow = addIngredientRow;

// Setup event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    fetchIngredients();
    addIngredientRow();

    // Attach form submit listeners
    const addIngForm = document.getElementById('add-ingredient-form');
    if(addIngForm) addIngForm.addEventListener('submit', handleAddIngredient);

    const recipeForm = document.getElementById('recipe-form');
    if(recipeForm) recipeForm.addEventListener('submit', handleSaveRecipe);
});