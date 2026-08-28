const token = localStorage.getItem('auth-token');
if (!token) {
  window.location.replace('/login.html');
}
document.querySelector('[data-testid="current-user"]').textContent =
  localStorage.getItem('auth-user') ?? '';
document.querySelector('[data-testid="logout"]').addEventListener('click', () => {
  localStorage.clear();
  window.location.assign('/login.html');
});

const success = document.querySelector('[data-testid="item-success"]');

function showFieldError(field, message) {
  const node = document.querySelector(`[data-testid="${field}-error"]`);
  node.textContent = message;
  node.hidden = message === '';
}

document.querySelector('#item-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  success.hidden = true;
  for (const field of ['name', 'price', 'quantity']) {
    showFieldError(field, '');
  }

  const name = document.querySelector('#name').value.trim();
  const price = Number(document.querySelector('#price').value);
  const quantity = Number(document.querySelector('#quantity').value);

  let invalid = false;
  if (name === '') {
    showFieldError('name', 'Name is required');
    invalid = true;
  }
  if (!Number.isFinite(price) || price < 0) {
    showFieldError('price', 'Price must be a number of 0 or more');
    invalid = true;
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    showFieldError('quantity', 'Quantity must be a whole number of 0 or more');
    invalid = true;
  }
  if (invalid) {
    return;
  }

  const response = await fetch('/api/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, price, quantity }),
  });
  const created = await response.json();
  success.textContent = `Created ${created.name}`;
  success.hidden = false;
  document.querySelector('#item-form').reset();
});
