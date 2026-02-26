
//arrays!
const products = [
    {name: 'cat', price: 20, description: 'Calico Cat', category: 'animal', inStock: true },
    {name: 'dog', price: 30, description: 'Brown Dachshund Dog', category: 'animal', inStock: true },
    {name: 'fish', price: 10, description: 'Blue Beta Fish', category: 'animal', inStock: true } 
]

//function - price!
function formatPrice(price)
{
    return '$' + price.toFixed(2);
}

//function - cards!
function createProductCard(product)
{
    const statusText = product.inStock ? 'In Stock' : 'Out of Stock';
    const statusClass = product.inStock ? 'In Stock' : 'Out of Stock';

    return `<div class="product-card">
        <h2>${product.name}</h2>
        <div class="price">${formatPrice(product.price)}</div>
        <p class="description">${product.description}</p>
        <span class="category">${product.category}</span>
        <div class="stock-status ${statusClass}">${statusText}</div>
        </div>`;
}

//function - render!
function renderProducts()
{
    productGrid.innerHTML = ``;

    for (let i = 0; i < products.length; i++)
    {
        const currentProduct = products[i];
        const cardHTML = createProductCard(currentProduct);
        productGrid.innerHTML += cardHTML;
    }
}

//submission!
function addItemToList(event) {
  // Prevent the default form submission behavior (which would reload the page)
  event.preventDefault();
  // TODO: Add your code here
    const nameValue = document.getElementById('productName').value;
    const priceValue = document.getElementById('productPrice').value;
    const descValue = document.getElementById('productDescription').value;
    const cateValue = document.getElementById('productCategory').value;
    const stockValue = document.getElementById('productInStock').checked;

    const formattedPrice = parseFloat(priceValue);

    const newProduct = {name: nameValue, price: formattedPrice, description: descValue, category: cateValue, inStock: stockValue };

    products.push(newProduct);
    renderProducts();
    document.getElementById('productForm').reset();
}

productForm.addEventListener('submit', addItemToList);
