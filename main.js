$(document).ready(function () {

  /* ══════════════════════════════
     AUTH STATE (localStorage simulation)
     In Flask version, replace with session checks
  ══════════════════════════════ */
  function isLoggedIn() {
    return localStorage.getItem('is_logged_in') === 'true';
  }

  function getUser() {
    return {
      username: localStorage.getItem('username') || 'User',
      email: localStorage.getItem('user_email') || '',
      initials: (localStorage.getItem('username') || 'U').charAt(0).toUpperCase()
    };
  }

  function setUser(username, email) {
    localStorage.setItem('is_logged_in', 'true');
    localStorage.setItem('username', username);
    localStorage.setItem('user_email', email);
  }

  function clearUser() {
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('username');
    localStorage.removeItem('user_email');
  }

  /* ══════════════════════════════
     UPDATE NAVBAR based on login state
  ══════════════════════════════ */
  function updateNavbar() {
    if (isLoggedIn()) {
      var user = getUser();
      $('#nav-login-area').hide();
      $('#nav-profile-area').show();
      $('#nav-avatar').text(user.initials);
      $('#nav-username').text(user.username);
      $('#dropdown-avatar').text(user.initials);
      $('#dropdown-name').text(user.username);
      $('#dropdown-email').text(user.email);

      // Hide modal close button so user can't dismiss without logging in
      $('#modal-close-btn').show();
    } else {
      $('#nav-login-area').show();
      $('#nav-profile-area').hide();
      // Show popup after 2.5s if not logged in
      setTimeout(function () {
        if (!isLoggedIn() && window.location.pathname === '/') {
          openModal();
         
        }
      }, 2500);
    }
  }

  updateNavbar();


  /* ══════════════════════════════
     CHECKS FOR FLASK SESSION
  ══════════════════════════════ */
  if(isLoggedIn()) {
    $.ajax({
        url: '/api/check-session',
        method: 'GET',
        success: function(data) {
            if(!data.logged_in) {
                clearUser();
                updateNavbar();
            }
        }
    });
  }

  /* ══════════════════════════════
     REQUIRE LOGIN — blocks navigation
  ══════════════════════════════ */
  window.requireLogin = function (e, page) {
    e.preventDefault();
    if (isLoggedIn()) {
      window.location.href = page;
    } else {
      openModal();
      showToast('Please login first to access this feature', 'error');
        // store where they wanted to go
       localStorage.setItem('redirectAfterLogin', page);
    }
  };

  /* ══════════════════════════════
     MODAL OPEN / CLOSE
  ══════════════════════════════ */
  window.openModal = function () {
    $('#login-modal').css('display', 'flex');
    // Restart animation
    var card = $('.modal-card')[0];
    void card.offsetWidth;
  };

  window.closeModal = function () {
    $('#login-modal').css('display', 'none');
};

  // Prevent backdrop close unless logged in
  $('#login-modal').on('click', function (e) {
    if ($(e.target).is('#login-modal') && isLoggedIn()) {
      closeModal();
    }
  });

  $(document).on('keydown', function (e) {
    if (e.key === 'Escape' && isLoggedIn()) closeModal();
  });

  /* ══════════════════════════════
     TAB SWITCHING (Login / Register)
  ══════════════════════════════ */
  window.switchTab = function (tab) {
    if (tab === 'login') {
      $('#tab-login').addClass('active');
      $('#tab-register').removeClass('active');
      $('#form-login').show();
      $('#form-register').hide();
    } else {
      $('#tab-register').addClass('active');
      $('#tab-login').removeClass('active');
      $('#form-register').show();
      $('#form-login').hide();
    }
    // Clear errors
    $('.input-error').text('');
    $('.form-error-banner').hide();
    $('.form-input').removeClass('input-error-state input-success-state');
  };

  /* ══════════════════════════════
     TOGGLE PASSWORD VISIBILITY
  ══════════════════════════════ */
  window.togglePass = function (inputId, btn) {
    var input = document.getElementById(inputId);
    var icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  };

  /* ══════════════════════════════
     PASSWORD STRENGTH METER
  ══════════════════════════════ */
  $('#reg-password').on('input', function () {
    var pwd = $(this).val();
    var strength = 0;
    var label = '';
    var color = '';

    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength <= 1) { label = 'Weak'; color = '#ff4757'; }
    else if (strength <= 3) { label = 'Medium'; color = '#ffa502'; }
    else if (strength === 4) { label = 'Strong'; color = '#00d4ff'; }
    else { label = 'Very Strong'; color = '#00ff88'; }

    var percent = (strength / 5) * 100;
    $('#pwd-bar').css({ width: percent + '%', background: color });
    $('#pwd-strength-label').text(pwd.length > 0 ? 'Password Strength: ' + label : '').css('color', color);
  });

  /* ══════════════════════════════
     VALIDATION HELPERS
  ══════════════════════════════ */
  function showError(fieldId, errId, msg) {
    $('#' + fieldId).addClass('input-error-state').removeClass('input-success-state');
    $('#' + errId).text(msg);
    return false;
  }

  function showSuccess(fieldId) {
    $('#' + fieldId).removeClass('input-error-state').addClass('input-success-state');
  }

  function clearErrors() {
    $('.input-error').text('');
    $('.form-input').removeClass('input-error-state input-success-state');
    $('.form-error-banner').hide().text('');
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /* ══════════════════════════════
     LOGIN SUBMIT
  ══════════════════════════════ */
 window.submitLogin = function () {
    clearErrors();
    var email = $('#login-email').val().trim();
    var password = $('#login-password').val();
    var valid = true;
	var rememberMe = $('#remember-me').is(':checked');

    if (!email) { showError('login-email', 'err-login-email', 'Email is required'); valid = false; }
    else if (!isValidEmail(email)) { showError('login-email', 'err-login-email', 'Enter a valid email'); valid = false; }
    else { showSuccess('login-email'); }

    if (!password) { showError('login-password', 'err-login-password', 'Password is required'); valid = false; }
    else { showSuccess('login-password'); }

    if (!valid) return;

    $('#login-btn-text').hide();
    $('#login-btn-loader').show();

    $.ajax({
        url: '/login',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ email: email, password: password, remember_me : rememberMe }),
        success: function (data) {
            $('#login-btn-text').show();
            $('#login-btn-loader').hide();
            if (data.success) {
                // store minimal info for navbar display only
                localStorage.setItem('is_logged_in', 'true');
                localStorage.setItem('username', data.username);
                localStorage.setItem('user_email', email);
                updateNavbar();
                $('#login-modal').css('display', 'none');
                showToast('✓ Welcome back, ' + data.username + '!', 'success');
                // redirect after short delay
                setTimeout(function () {
                    window.location.href = data.redirect;
                }, 800);
            } else {
                $('#login-error-banner').text(data.error || 'Invalid credentials').show();
            }
        },
        error: function () {
            $('#login-btn-text').show();
            $('#login-btn-loader').hide();
            $('#login-error-banner').text('Login failed. Please try again.').show();
        }
    });
};


  /* ══════════════════════════════
     REGISTER SUBMIT
  ══════════════════════════════ */
  window.submitRegister = function () {
    clearErrors();
    var username = $('#reg-username').val().trim();
    var email = $('#reg-email').val().trim();
    var password = $('#reg-password').val();
    var confirm = $('#reg-confirm').val();
    var valid = true;

    if (!username || username.length < 2) { showError('reg-username', 'err-reg-username', 'Name must be at least 2 characters'); valid = false; }
    else { showSuccess('reg-username'); }
    if (!email) { showError('reg-email', 'err-reg-email', 'Email is required'); valid = false; }
    else if (!isValidEmail(email)) { showError('reg-email', 'err-reg-email', 'Enter a valid email'); valid = false; }
    else { showSuccess('reg-email'); }
    if (!password || password.length < 6) { showError('reg-password', 'err-reg-password', 'Min 6 characters'); valid = false; }
    else { showSuccess('reg-password'); }
    if (password !== confirm) { showError('reg-confirm', 'err-reg-confirm', 'Passwords do not match'); valid = false; }
    else if (password.length >= 6) { showSuccess('reg-confirm'); }

    if (!valid) return;

    $('#reg-btn-text').hide();
    $('#reg-btn-loader').show();

    $.ajax({
        url: '/register',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username: username, email: email, password: password }),
        success: function (data) {
            $('#reg-btn-text').show();
            $('#reg-btn-loader').hide();
            if (data.success) {
                showToast('✓ Account created! Please log in.', 'success');
                switchTab('login');
            } else {
                $('#reg-error-banner').text(data.error || 'Registration failed').show();
            }
        },
        error: function () {
            $('#reg-btn-text').show();
            $('#reg-btn-loader').hide();
            $('#reg-error-banner').text('Registration failed. Please try again.').show();
        }
    });
};

  /* ══════════════════════════════
     LOGOUT
  ══════════════════════════════ */
 window.logoutUser = function () {
    $.ajax({
        url: '/logout',
        method: 'GET',
        success: function () {
            localStorage.removeItem('is_logged_in');
            localStorage.removeItem('username');
            localStorage.removeItem('user_email');
            window.location.href = '/';
        }
    });
};

  /* ══════════════════════════════
     PROFILE DROPDOWN TOGGLE
  ══════════════════════════════ */
  window.toggleProfileDropdown = function () {
    $('#profile-dropdown').toggleClass('open');
  };

  // Close dropdown on outside click
  $(document).on('click', function (e) {
    if (!$(e.target).closest('#nav-profile-area').length) {
      $('#profile-dropdown').removeClass('open');
    }
  });

  /* ══════════════════════════════
     TOAST NOTIFICATION
  ══════════════════════════════ */
  window.showToast = function (msg, type) {
    var $toast = $('#toast-notification');
    var $icon = $('#toast-icon');
    var $msg = $('#toast-msg');

    $msg.text(msg);
    if (type === 'error') {
      $icon.text('✕').addClass('error');
      $toast.css('border-color', 'rgba(255,71,87,.3)');
    } else {
      $icon.text('✓').removeClass('error');
      $toast.css('border-color', 'rgba(0,255,136,.3)');
    }

    $toast.addClass('show');
    setTimeout(function () { $toast.removeClass('show'); }, 3500);
  };

  /* ══════════════════════════════
     SCROLL HELPERS
  ══════════════════════════════ */
  window.scrollToSection = function (id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  /* ══════════════════════════════
     TICKER BAR / NAV SCROLL
  ══════════════════════════════ */
  function updateScrollPadding(navTop) {
    document.documentElement.style.scrollPaddingTop = (navTop + 70 + 16) + 'px';
  }

  $(window).on('scroll', function () {
    var scrollY = $(this).scrollTop();
    if (scrollY > 80) {
      $('#ticker-bar').addClass('hidden');
      $('#main-nav').css('top', '0');
      updateScrollPadding(0);
    } else {
      $('#ticker-bar').removeClass('hidden');
      $('#main-nav').css('top', '');
      updateScrollPadding(36);
    }
    if (scrollY > 10) { $('#main-nav').addClass('scrolled'); }
    else { $('#main-nav').removeClass('scrolled'); }
  });

  updateScrollPadding(36);

  /* ══════════════════════════════
     MOBILE MENU
  ══════════════════════════════ */
  window.toggleMobile = function () {
    $('#mobile-menu').toggleClass('open');
  };

  /* ══════════════════════════════
     CAROUSEL
  ══════════════════════════════ */
  var currentSlide = 0;
  var carouselTimer = null;
  var carouselPaused = false;
  var totalSlides = 5;
  var $slides = $('.carousel-slide');
  var $bars = $('.prog-bar');

  function goToSlide(n) {
    n = ((n % totalSlides) + totalSlides) % totalSlides;
    $slides.removeClass('active');
    $slides.eq(n).addClass('active');
    $bars.removeClass('active');
    $bars.find('.prog-bar-fill').css('width', '0');
    $bars.eq(n).addClass('active');
    $('.slide-counter').text(String(n + 1).padStart(2, '0') + ' / 05');
    currentSlide = n;
  }

  function startCarousel() {
    clearInterval(carouselTimer);
    carouselTimer = setInterval(function () {
      if (!carouselPaused) goToSlide(currentSlide + 1);
    }, 4500);
  }

  goToSlide(0);
  startCarousel();

  $('#next-btn').on('click', function () { goToSlide(currentSlide + 1); startCarousel(); });
  $('#prev-btn').on('click', function () { goToSlide(currentSlide - 1); startCarousel(); });
  $('#carousel').on('mouseenter', function () { carouselPaused = true; }).on('mouseleave', function () { carouselPaused = false; });
  $bars.on('click', function () { goToSlide($bars.index(this)); startCarousel(); });

  /* ══════════════════════════════
     TYPING ANIMATION
  ══════════════════════════════ */
  var words = ['DATA BREACH', 'EMAIL EXPOSURE', 'DIGITAL IDENTITY', 'ACCOUNT SAFETY', 'CYBER THREATS'];
  var wi = 0, ci = 0, deleting = false;
  var typeEl = document.getElementById('type-text');

  if (typeEl) {
    function typeLoop() {
      var word = words[wi];
      if (!deleting) {
        ci++;
        typeEl.innerHTML = word.slice(0, ci) + '<span class="cursor-blink"></span>';
        if (ci === word.length) { deleting = true; setTimeout(typeLoop, 1800); return; }
      } else {
        ci--;
        typeEl.innerHTML = word.slice(0, ci) + '<span class="cursor-blink"></span>';
        if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
      }
      setTimeout(typeLoop, deleting ? 60 : 100);
    }
    typeLoop();
  }

  /* ══════════════════════════════
     PARTICLES CANVAS
  ══════════════════════════════ */
  var canvas = document.getElementById('particles-canvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var particles = [], W, H;

    function resizeCanvas() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function Particle() { this.reset(); }
    Particle.prototype.reset = function () {
      this.x = Math.random() * W; this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.4; this.vy = (Math.random() - 0.5) * 0.4;
      this.r = Math.random() * 1.5 + 0.5; this.alpha = Math.random() * 0.5 + 0.2;
    };
    Particle.prototype.update = function () {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    };
    Particle.prototype.draw = function () {
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,255,136,' + this.alpha + ')'; ctx.fill();
    };

    for (var i = 0; i < 100; i++) particles.push(new Particle());

    function drawParticles() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(function (p) { p.update(); p.draw(); });
      for (var a = 0; a < particles.length; a++) {
        for (var b = a + 1; b < particles.length; b++) {
          var dx = particles[a].x - particles[b].x;
          var dy = particles[a].y - particles[b].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath(); ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.strokeStyle = 'rgba(0,255,136,' + (0.15 * (1 - dist / 100)) + ')';
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      requestAnimationFrame(drawParticles);
    }
    drawParticles();
  }

  /* ══════════════════════════════
     SHIELD 3D PARALLAX
  ══════════════════════════════ */
  var shield = document.getElementById('shield-3d');
  if (shield && window.innerWidth > 768) {
    document.addEventListener('mousemove', function (e) {
      var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      var rx = (e.clientY - cy) / cy * 8;
      var ry = (e.clientX - cx) / cx * -8;
      shield.style.transform = 'perspective(600px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    });
  }

  /* ══════════════════════════════
     SCROLL REVEAL
  ══════════════════════════════ */
  var revealEls = document.querySelectorAll('.reveal');
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12 });
  revealEls.forEach(function (el) { revealObserver.observe(el); });

  /* ══════════════════════════════
     STATS COUNTER
  ══════════════════════════════ */
  var counterEls = document.querySelectorAll('.stat-big[data-target]');
  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && !e.target.dataset.counted) {
        e.target.dataset.counted = 'true';
        var target = parseInt(e.target.dataset.target);
        var suffix = e.target.dataset.suffix || '';
        var divisor = parseInt(e.target.dataset.divisor) || 1;
        var displayTarget = Math.round(target / divisor);
        var current = 0;
        var inc = displayTarget / 80;
        var timer = setInterval(function () {
          current += inc;
          if (current >= displayTarget) { current = displayTarget; clearInterval(timer); }
          e.target.textContent = Math.floor(current) + suffix;
        }, 20);
      }
    });
  }, { threshold: 0.3 });
  counterEls.forEach(function (el) { counterObserver.observe(el); });

  /* ══════════════════════════════
     STEPS LINE ANIMATION
  ══════════════════════════════ */
  var stepsLine = document.getElementById('steps-line-fill');
  if (stepsLine) {
    var lineObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) stepsLine.classList.add('animated'); });
    }, { threshold: 0.4 });
    lineObs.observe(document.getElementById('how'));
  }

  /* ══════════════════════════════
     FEATURE CARDS 3D TILT + LIGHT
  ══════════════════════════════ */
  $('.feature-card').on('mousemove', function (e) {
    var rect = this.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    $(this).find('.card-light').css({ left: mx - 40 + 'px', top: my - 40 + 'px' });
    var x = mx / rect.width - 0.5;
    var y = my / rect.height - 0.5;
    $(this).css('transform', 'translateY(-6px) rotateX(' + (-y * 10) + 'deg) rotateY(' + (x * 10) + 'deg)');
  }).on('mouseleave', function () {
    $(this).css('transform', '');
  });

  /* ══════════════════════════════
     THREAT COUNTER — Live counting simulation
  ══════════════════════════════ */
  var baseAttacks = 4823000;
  var baseRecords = 10000000000;
  var baseScans = 98423;
  var baseUsers = 12847;

  function formatNum(n) {
    if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return Math.floor(n / 1000) + 'K';
    return n.toLocaleString();
  }

  // Initial count-up
  var threatObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && !e.target.dataset.counted) {
        e.target.dataset.counted = 'true';
        animateThreat();
        // Keep updating attacks-today every 2s (simulated live)
        setInterval(function () {
          baseAttacks += Math.floor(Math.random() * 50 + 10);
          baseScans += Math.floor(Math.random() * 3 + 1);
          $('#attacks-today').text(formatNum(baseAttacks));
          $('#scans-done').text(formatNum(baseScans));
        }, 2000);
      }
    });
  }, { threshold: 0.3 });

  var threatSection = document.getElementById('threat-counter');
  if (threatSection) threatObserver.observe(threatSection);

  function animateThreat() {
    var targets = [
      { id: 'attacks-today', val: baseAttacks },
      { id: 'records-stolen', val: baseRecords },
      { id: 'scans-done', val: baseScans },
      { id: 'users-protected', val: baseUsers }
    ];
    targets.forEach(function (t) {
      var el = document.getElementById(t.id);
      if (!el) return;
      var steps = 60, current = 0, step = t.val / steps;
      var timer = setInterval(function () {
        current += step;
        if (current >= t.val) { current = t.val; clearInterval(timer); }
        el.textContent = formatNum(Math.floor(current));
      }, 25);
    });
  }


  /* ══════════════════════════════
     SESSION EXPIRE HANDLING
  ══════════════════════════════ */
	$(document).ajaxError(function(event, xhr) {
		if(xhr.status === 401) {
			// Flask session expired — clear localStorage and redirect
			localStorage.removeItem('is_logged_in');
			localStorage.removeItem('username');
			localStorage.removeItem('user_email');
			 window.location.href = '/login';
		}
	});
});