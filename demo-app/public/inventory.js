const token = localStorage.getItem('auth-token');
if (!token) {
  window.location.replace('/login.html');
}

const body = document.querySelector('[data-testid="inventory-body"]');
const emptyState = document.querySelector('[data-testid="empty-state"]');
const search = document.querySelector('#search');
let items = [];

function render() {
  const term = search.value.trim().toLowerCase();
  const visible = items.filter((item) => item.name.toLowerCase().includes(term));
  body.replaceChildren(
    ...visible.map((item) => {
      const row = document.createElement('tr');
      row.dataset.itemId = item.id;
      for (const value of [item.name, item.price.toFixed(2), String(item.quantity)]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    }),
  );
  emptyState.hidden = visible.length > 0;
}

document.querySelector('[data-testid="current-user"]').textContent =
  localStorage.getItem('auth-user') ?? '';

document.querySelector('[data-testid="logout"]').addEventListener('click', () => {
  localStorage.clear();
  window.location.assign('/login.html');
});

search.addEventListener('input', render);

fetch('/api/items', { headers: { authorization: `Bearer ${token}` } })
  .then((response) => response.json())
  .then((data) => {
    items = data;
    render();
  });
