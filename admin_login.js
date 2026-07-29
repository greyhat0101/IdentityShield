 // Check if already logged in
  if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    window.location.href = 'admin.html';
  }

  function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeIcon.classList.remove('fa-eye');
      eyeIcon.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      eyeIcon.classList.remove('fa-eye-slash');
      eyeIcon.classList.add('fa-eye');
    }
  }

  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toast.classList.remove('success', 'error');
    toast.classList.add(type);
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  function clearErrors() {
    document.querySelectorAll('.form-group').forEach(group => {
      group.classList.remove('error');
      group.querySelector('.form-error').textContent = '';
    });
  }

  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePassword(password) {
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters' };
    }
    return { valid: true };
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearErrors();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');

    // Validation
    let hasError = false;

    if (!email) {
      showFieldError('email', 'Email is required');
      hasError = true;
    } else if (!validateEmail(email)) {
      showFieldError('email', 'Please enter a valid email');
      hasError = true;
    }

    if (!password) {
      showFieldError('password', 'Password is required');
      hasError = true;
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        showFieldError('password', passwordValidation.message);
        hasError = true;
      }
    }

    if (hasError) return;

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');

    // Simulate API call (in real app, call your backend)
    setTimeout(() => {
      // Default credentials
      const defaultEmail = 'admin@identityshield.com';
      const defaultPassword = 'Admin@123';

      // In production, NEVER do this on frontend. Always validate on backend!
      if (email === defaultEmail && password === defaultPassword) {
        // Store session
        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('adminEmail', email);
        sessionStorage.setItem('adminLoginTime', new Date().getTime());
        
        if (document.getElementById('rememberMe').checked) {
          localStorage.setItem('adminRemembered', email);
        }

        showToast('✓ Login successful! Redirecting...', 'success');
        
        setTimeout(() => {
          window.location.href = 'admin.html';
        }, 1500);
      } else {
        showFieldError('email', 'Invalid email or password');
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        showToast('✗ Login failed. Check credentials.', 'error');
      }
    }, 800);
  }

  function showFieldError(fieldId, message) {
    const formGroup = document.getElementById(fieldId).closest('.form-group');
    const errorDiv = formGroup.querySelector('.form-error');
    formGroup.classList.add('error');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
  }

  // Pre-fill email if remembered
  window.addEventListener('load', () => {
    const remembered = localStorage.getItem('adminRemembered');
    if (remembered) {
      document.getElementById('email').value = remembered;
    }
  });

