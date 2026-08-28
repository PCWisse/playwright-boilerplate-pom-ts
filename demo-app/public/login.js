const form = document.querySelector('#login-form');
const error = document.querySelector('[data-testid="login-error"]');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.hidden = true;
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: document.querySelector('#username').value,
      password: document.querySelector('#password').value,
    }),
  });
  if (response.ok) {
    const body = await response.json();
    localStorage.setItem('auth-token', body.token);
    localStorage.setItem('auth-user', body.username);
    window.location.assign('/inventory.html');
    return;
  }
  const body = await response.json();
  error.textContent = body.error;
  error.hidden = false;
});
