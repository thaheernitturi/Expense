document.getElementById('signup-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');

    try {
        const response = await fetch('http://localhost:3000/user/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageElement.style.color = 'green';
            messageElement.textContent = 'Account created successfully! Redirecting...';
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        } else {
            messageElement.style.color = 'red';
            messageElement.textContent = data.message || 'Signup failed';
        }
    } catch (error) {
        messageElement.style.color = 'red';
        messageElement.textContent = 'Server connection failed';
    }
});