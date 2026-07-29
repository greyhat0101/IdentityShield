// ── Utility: UTC string → IST display ──
function toIST(utcDateStr) {
  if (!utcDateStr) return 'Unknown';
  var d = new Date(utcDateStr.replace(' ', 'T'));
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

// ── Utility: mask email for privacy ──
function maskEmail(email) {
  if (!email) return '****';
  var parts = email.split('@');
  return parts[0].charAt(0) + '****@' + parts[1];
}

// ── Known platform metadata ──
var PLATFORM_META = {
  'linkedin':  { label: 'LinkedIn',  abbr: 'in', color: '#0077b5', dataTypes: ['Email', 'Password', 'Phone', 'Username'],        desc: 'LinkedIn suffered a major data scrape exposing professional profile data, emails and hashed passwords.' },
  'adobe':     { label: 'Adobe',     abbr: 'Ai', color: '#ff0000', dataTypes: ['Email', 'Password Hash', 'Username'],             desc: 'Adobe Creative Cloud breach exposed user credentials including bcrypt-hashed passwords and subscription info.' },
  'dropbox':   { label: 'Dropbox',   abbr: 'Db', color: '#0061ff', dataTypes: ['Email', 'Password Hash'],                        desc: 'Dropbox credentials leak exposed SHA-1 hashed passwords and email addresses from their 2012 breach.' },
  'twitter':   { label: 'Twitter',   abbr: 'Tw', color: '#1da1f2', dataTypes: ['Email', 'Phone', 'Username'],                    desc: 'Twitter API vulnerability exposed emails and phone numbers linked to millions of accounts.' },
  'facebook':  { label: 'Facebook',  abbr: 'Fb', color: '#1877f2', dataTypes: ['Email', 'Phone', 'Name', 'Location'],           desc: '533 million Facebook records including phone numbers and personal info were leaked on a hacker forum.' },
  'yahoo':     { label: 'Yahoo',     abbr: 'Yh', color: '#6001d2', dataTypes: ['Email', 'Password Hash', 'Security Q&A', 'DOB'], desc: 'Yahoo suffered the largest breach in history with 3 billion accounts compromised including hashed passwords.' },
  'canva':     { label: 'Canva',     abbr: 'Cv', color: '#00c4cc', dataTypes: ['Email', 'Name', 'Username', 'Password Hash'],   desc: 'Canva breach exposed usernames, real names, email addresses and bcrypt-hashed passwords.' }
};

// =========================================================
//  ON READY
// =========================================================
$(document).ready(function () {

  // Greeting
  var h = new Date().getHours();
  $('#welcome-greeting').text(h < 12 ? 'Good Morning,' : h < 17 ? 'Good Afternoon,' : 'Good Evening,');

  // ── 1. Load real profile from Flask ──
  $.ajax({
    url: '/api/user-profile',
    method: 'GET',
    success: function (u) {
      var initials = u.username.charAt(0).toUpperCase();

      // Sidebar
      $('#sidebar-avatar').text(initials);
      $('#sidebar-username').text(u.username);
      $('#sidebar-email').text(u.email);

      // Navbar profile area
      $('#nav-avatar, #dropdown-avatar').text(initials);
      $('#nav-username, #dropdown-name').text(u.username);
      $('#dropdown-email').text(u.email);

      // Welcome banner
      $('#welcome-name').text(u.username + '! \uD83D\uDC4B');

      // Profile tab — avatar card
      $('#profile-big-avatar').text(initials);
      $('#profile-card-name').text(u.username);
      $('#profile-card-email').text(u.email);
      $('#pi-name').text(u.username);
      $('#pi-email').text(u.email);
      $('#pi-scans').text(u.total_scans);

      // Member since
      var joined = u.created_at
        ? new Date(u.created_at.replace(' ', 'T') + 'Z')
            .toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
        : 'Unknown';
      $('#profile-card-joined').text('Member since ' + joined);

      // Pre-fill edit modal
      $('#edit-username-input').val(u.username);
      $('#edit-email-display').text(u.email);
    },
    error: function () {
      $('#sidebar-username').text('User');
      $('#welcome-name').text('User! \uD83D\uDC4B');
    }
  });

  // ── 2. Read stat counters from Flask body data attributes ──
  var total_scans    = parseInt(document.body.dataset.totalScans)    || 0;
  var breaches_found = parseInt(document.body.dataset.breachesFound) || 0;
  var safe_accounts  = parseInt(document.body.dataset.safeAccounts)  || 0;
  var active_alerts  = parseInt(document.body.dataset.activeAlerts)  || 0;

  animateCounter('stat-total-scans', total_scans);
  animateCounter('stat-breaches',    breaches_found);
  animateCounter('stat-safe',        safe_accounts);
  animateCounter('stat-alerts',      active_alerts);

  // Make stat cards clickable — navigate to relevant tab
  $('.dash-stat-card.card-blue').css('cursor','pointer').off('click').on('click', function(){ showTab('history'); });
  $('.dash-stat-card.card-red').css('cursor','pointer').off('click').on('click', function(){ showTab('exposure'); });
  $('.dash-stat-card.card-green').css('cursor','pointer').off('click').on('click', function(){ showTab('history'); filterHistory('safe', $('.hf-btn').eq(2)[0]); });
  $('.dash-stat-card.card-violet').css('cursor','pointer').off('click').on('click', function(){ showTab('history'); filterHistory('breach', $('.hf-btn').eq(1)[0]); });

  $('#breach-trend').text(breaches_found > 0 ? breaches_found + ' need attention' : 'All clear!')
                    .css('color', breaches_found > 0 ? 'var(--red)' : 'var(--green)');

  // ── 3. Fetch scan history ──
  $.ajax({
    url: '/api/scan-history',
    method: 'GET',
    success: function (data) {
      var scans = data.scans.map(function (s) {
        var rawSites = (function () {
          try {
            var arr = JSON.parse(s.breached_sites || '[]');
            if (!arr.length || arr[0] === 'None' || arr[0] === 'All') return [];
            return arr;
          } catch (e) { return []; }
        })();
        return {
          id:       s.id,
          date:     toIST(s.scan_date),
          email:    maskEmail(s.scanned_email),
          platform: rawSites.length === 0 ? 'All'
                  : rawSites.length === 1 ? rawSites[0]
                  : rawSites[0] + ' +' + (rawSites.length - 1) + ' more',
          sites:    rawSites,
          result:   s.breach_count > 0 ? 'BREACH' : 'SAFE',
          risk:     s.risk_score  || 0,
          level:    s.risk_level  || 'LOW'
        };
      });
      renderDashboard(scans);
      renderKnownExposures(scans);
    },
    error: function () {
      renderDashboard([]);
      renderKnownExposures([]);
    }
  });

  // Reveal animations
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
});

// =========================================================
//  RENDER DASHBOARD (risk meter + tables)
// =========================================================
function renderDashboard(scans) {
  var lastRisk = scans[0] ? scans[0].risk : 0;

  // Circular risk meter
  setTimeout(function () {
    var circle  = document.getElementById('risk-circle');
    var riskNum = document.getElementById('risk-num-text');
    if (circle && riskNum) {
      var circumference = 502;
      var offset = circumference - (lastRisk / 100) * circumference;
      var color  = lastRisk >= 80 ? '#ff4757' : lastRisk >= 50 ? '#ffa502' : lastRisk >= 30 ? '#00d4ff' : '#00ff88';
      circle.style.strokeDashoffset = offset;
      circle.style.stroke = color;
      circle.style.transition = 'stroke-dashoffset 1.5s ease, stroke .5s';
      riskNum.textContent = lastRisk;
      var labels = { 0: 'SECURE', 30: 'LOW RISK', 50: 'MEDIUM RISK', 70: 'HIGH RISK', 80: 'CRITICAL' };
      var lk = Object.keys(labels).filter(function (k) { return lastRisk >= parseInt(k); }).pop() || '0';
      $('#risk-status-label').text(labels[lk]).css('color', color);
      $('#shield-score-display').text(lastRisk);
      $('#pi-risk').text(labels[lk]).css('color', color);
    }
    $('#last-scan-date').text(scans[0] ? scans[0].date : 'Never');
    $('#sidebar-badge').text(lastRisk >= 70 ? '\uD83D\uDD34 High Risk' : lastRisk >= 30 ? '\uD83D\uDFE1 Medium Risk' : '\uD83D\uDFE2 Secure');
  }, 500);

  // Recent scans table (overview tab, 5 rows max, no action column)
  var tbody = $('#recent-scans-body');
  tbody.empty();
  if (scans.length === 0) {
    tbody.append('<tr><td colspan="5" class="no-data">No scans yet. <a href="/scanner" class="modal-link">Scan now \u2192</a></td></tr>');
  } else {
    scans.slice(0, 5).forEach(function (s) {
      var badge       = s.result === 'SAFE' ? 'badge-low' : s.level === 'MEDIUM' ? 'badge-medium' : s.level === 'HIGH' ? 'badge-high' : s.level === 'CRITICAL' ? 'badge-critical' : 'badge-low';
      var resultClass = s.result === 'SAFE' ? 'result-safe-cell' : 'result-breach-cell';
      tbody.append(
        '<tr>'
        + '<td>' + s.date + '</td>'
        + '<td style="font-family:Share Tech Mono,monospace;font-size:11px;color:var(--cyan)">' + s.email + '</td>'
        + '<td>' + s.platform + '</td>'
        + '<td class="' + resultClass + '">' + s.result + '</td>'
        + '<td><span class="risk-badge ' + badge + '">' + s.risk + '/100</span></td>'
        + '</tr>'
      );
    });
  }

  // Full scan history table (with action column)
  var ftbody = $('#full-history-body');
  ftbody.empty();
  if (scans.length === 0) {
    ftbody.append('<tr><td colspan="6" class="no-data">No scan history yet.</td></tr>');
  } else {
    scans.forEach(function (s) {
      var badge       = s.result === 'SAFE' ? 'badge-low' : s.level === 'MEDIUM' ? 'badge-medium' : s.level === 'HIGH' ? 'badge-high' : s.level === 'CRITICAL' ? 'badge-critical' : 'badge-low';
      var resultClass = s.result === 'SAFE' ? 'result-safe-cell' : 'result-breach-cell';
      ftbody.append(
        '<tr>'
        + '<td>' + s.date + '</td>'
        + '<td style="font-family:Share Tech Mono,monospace;font-size:11px;color:var(--cyan)">' + s.email + '</td>'
        + '<td>' + s.platform + '</td>'
        + '<td class="' + resultClass + '">' + s.result + '</td>'
        + '<td><span class="risk-badge ' + badge + '">' + s.risk + '/100</span></td>'
        + '<td class="action-btns"><button class="abt view-btn" title="View Exposure Details" onclick=\'showExposureForScan(' + JSON.stringify(s).replace(/'/g, "\\'") + ')\'><i class="fas fa-eye"></i></button>'
        + '<button class="abt" title="Download PDF Report" style="background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);color:var(--green);border-radius:6px;padding:5px 8px;cursor:pointer;margin-left:4px;" onclick="downloadScanReport(' + s.id + ')"><i class="fas fa-file-pdf"></i></button></td>'
        + '</tr>'
      );
    });
  }
}

// =========================================================
//  KNOWN EXPOSURES WIDGET (overview tab)
// =========================================================
function renderKnownExposures(scans) {
  var list = $('#exposure-list');
  list.empty();

  // Find most recent scan that has actual breach sites
  var breachedScan = null;
  for (var i = 0; i < scans.length; i++) {
    if (scans[i].result === 'BREACH' && scans[i].sites && scans[i].sites.length > 0) {
      breachedScan = scans[i];
      break;
    }
  }

  if (!breachedScan) {
    list.html(
      '<div style="text-align:center;padding:28px 16px;">'
      + '<div style="font-size:32px;margin-bottom:10px;">\uD83D\uDEE1\uFE0F</div>'
      + '<div style="color:var(--green);font-family:Orbitron,monospace;font-size:12px;font-weight:700;letter-spacing:1px;">NO EXPOSURES FOUND</div>'
      + '<div style="color:var(--text-secondary);font-size:12px;margin-top:6px;">Your scanned emails are clean.</div>'
      + '</div>'
    );
    return;
  }

  var riskColors = { CRITICAL: 'var(--red)', HIGH: 'var(--red)', MEDIUM: '#ffa502', LOW: 'var(--cyan)', NONE: 'var(--green)' };

  breachedScan.sites.forEach(function (site, idx) {
    var key  = site.toLowerCase().trim();
    var meta = PLATFORM_META[key] || {
      label: site, abbr: site.charAt(0).toUpperCase(),
      color: '#8a9ab0', dataTypes: ['Email', 'Password']
    };
    var itemLevel = idx === 0 ? breachedScan.level
                  : (breachedScan.level === 'CRITICAL' || breachedScan.level === 'HIGH') ? 'MEDIUM' : 'LOW';
    var itemColor = riskColors[itemLevel] || 'var(--cyan)';
    var shortLevel = itemLevel === 'CRITICAL' ? 'CRIT' : itemLevel === 'MEDIUM' ? 'MED' : itemLevel;

    list.append(
      '<div class="exposure-item" style="cursor:pointer;" onclick=\'showExposureForScan(' + JSON.stringify(breachedScan).replace(/'/g, "\\'") + ')\'>'
      + '  <div class="exp-icon" style="background:' + meta.color + ';display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:12px;border-radius:8px;">' + meta.abbr + '</div>'
      + '  <div class="exp-info"><div class="exp-name">' + meta.label + '</div><div class="exp-detail">' + meta.dataTypes.join(', ') + '</div></div>'
      + '  <div class="exp-risk" style="color:' + itemColor + ';border:1px solid ' + itemColor + ';padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:Orbitron,monospace;">' + shortLevel + '</div>'
      + '</div>'
    );
  });
}

// =========================================================
//  EXPOSURE DETAILS TAB
// =========================================================
function showExposureForScan(scan) {
  showTab('exposure');

  var container = $('#exposure-cards-container');
  var metaDiv   = $('#exposure-scan-meta');

  // Show meta info immediately
  metaDiv.html(
    '<i class="fas fa-shield-alt" style="color:var(--green);margin-right:6px;"></i>'
    + 'Exposure report for <span style="color:var(--cyan);font-weight:600;">' + scan.email + '</span>'
    + ' &nbsp;\u00B7&nbsp; ' + scan.date
  );

  // Show loading spinner while we fetch from backend
  container.html(
    '<div style="text-align:center;padding:48px;">'
    + '<i class="fas fa-spinner fa-spin" style="font-size:28px;color:var(--cyan);margin-bottom:16px;display:block;"></i>'
    + '<div style="color:var(--text-secondary);font-family:Share Tech Mono,monospace;font-size:13px;">Fetching breach details...</div>'
    + '</div>'
  );

  // SAFE scans don\'t need an API call
  if (scan.result === 'SAFE') {
    renderSafeCard(scan, container);
    return;
  }

  if (!scan.id) {
    container.html('<div class="no-data" style="padding:40px;text-align:center;">Scan ID missing. Please refresh the page.</div>');
    return;
  }

  // ── REAL BACKEND CALL ──
  $.ajax({
    url: '/api/breach-details/' + scan.id,
    method: 'GET',
    success: function (data) {
      container.empty();

      if (!data.reports || data.reports.length === 0) {
        renderSafeCard(scan, container);
        return;
      }

      var badgeClass = { CRITICAL: 'badge-critical', HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low' };

      data.reports.forEach(function (report, idx) {
        var name = report.breach_name || 'Unknown';
        var key  = name.toLowerCase().trim();
        var meta = PLATFORM_META[key] || { abbr: name.charAt(0).toUpperCase(), color: '#8a9ab0' };

        // data_exposed comes from XposedOrNot as comma-separated text
        var dataTypes = report.data_exposed
          ? report.data_exposed.split(',').map(function (d) { return d.trim(); }).filter(Boolean)
          : ['Email', 'Password'];
        var chips = dataTypes.map(function (dt) { return '<span class="data-type">' + dt + '</span>'; }).join('');

        var breachDate = report.breach_date
          ? new Date(report.breach_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Date unknown';

        var cardLevel = idx === 0 ? data.risk_level
                      : (data.risk_level === 'CRITICAL' || data.risk_level === 'HIGH') ? 'MEDIUM' : 'LOW';
        var cardBadge = badgeClass[cardLevel] || 'badge-low';
        var desc = report.breach_desc || ('Your data was found in a breach associated with ' + name + '. Change your password and enable MFA immediately.');

        var card = $(
          '<div class="exposure-detail-card reveal' + (idx > 0 ? ' reveal-delay-' + Math.min(idx, 3) : '') + '">'
          + '  <div class="exp-detail-header">'
          + '    <div class="exp-detail-logo" style="background:' + meta.color + ';display:flex;align-items:center;justify-content:center;font-family:Orbitron,monospace;font-weight:900;color:#fff;font-size:14px;border-radius:10px;">' + meta.abbr + '</div>'
          + '    <div style="flex:1;min-width:0;">'
          + '      <div class="exp-detail-name">' + name + '</div>'
          + '      <div class="exp-detail-date"><i class="fas fa-calendar-alt me-1" style="color:var(--text-muted);font-size:10px;"></i>Breach date: ' + breachDate + '</div>'
          + '    </div>'
          + '    <div class="risk-badge ' + cardBadge + '" style="margin-left:auto;flex-shrink:0;">' + cardLevel + ' RISK</div>'
          + '  </div>'
          + '  <div class="exp-detail-body">'
          + '    <div style="font-size:11px;color:var(--text-muted);font-family:Share Tech Mono,monospace;letter-spacing:1px;margin-bottom:8px;">DATA EXPOSED</div>'
          + '    <div class="exp-data-types" style="margin-bottom:14px;">' + chips + '</div>'
          + '    <div class="exp-detail-desc">' + desc + '</div>'
          + '  </div>'
          + '  <div class="exp-detail-actions">'
          + '    <button class="btn-exp-action danger-action"><i class="fas fa-key me-1"></i> Change Password</button>'
          + '    <button class="btn-exp-action safe-action"><i class="fas fa-mobile-alt me-1"></i> Enable MFA</button>'
          + '  </div>'
          + '</div>'
        );
        container.append(card);
      });

      setTimeout(function () { container.find('.reveal').addClass('visible'); }, 100);
    },
    error: function (xhr) {
      var msg = (xhr.responseJSON && xhr.responseJSON.error) ? xhr.responseJSON.error : 'Failed to load breach details.';
      container.html(
        '<div class="no-data" style="padding:40px;text-align:center;">'
        + '<i class="fas fa-exclamation-triangle" style="color:var(--red);font-size:28px;margin-bottom:12px;display:block;"></i>'
        + '<div style="color:var(--red);margin-bottom:8px;">Error loading details</div>'
        + '<div style="color:var(--text-secondary);font-size:13px;">' + msg + '</div>'
        + '</div>'
      );
    }
  });
}

// Safe-scan card (no breach found)
function renderSafeCard(scan, container) {
  container.html(
    '<div class="exposure-detail-card reveal" style="text-align:center;padding:52px 32px;">'
    + '<div style="font-size:56px;margin-bottom:20px;">\uD83D\uDEE1\uFE0F</div>'
    + '<div style="font-family:Orbitron,monospace;font-size:20px;font-weight:700;color:var(--green);letter-spacing:2px;margin-bottom:12px;">ALL CLEAR</div>'
    + '<div style="font-size:15px;color:var(--text-primary);margin-bottom:8px;">No data breaches were detected for <span style="color:var(--cyan);">' + scan.email + '</span></div>'
    + '<div style="font-size:13px;color:var(--text-secondary);max-width:420px;margin:0 auto 24px;">This email was not found in any known breach database at the time of this scan. Keep monitoring regularly.</div>'
    + '<div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">'
    + '  <span style="background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.25);color:var(--green);padding:6px 16px;border-radius:20px;font-size:12px;font-family:Share Tech Mono,monospace;"><i class="fas fa-check-circle me-1"></i> No Breaches Found</span>'
    + '  <span style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);color:var(--cyan);padding:6px 16px;border-radius:20px;font-size:12px;font-family:Share Tech Mono,monospace;"><i class="fas fa-clock me-1"></i> Scanned ' + scan.date + '</span>'
    + '</div>'
    + '<div style="margin-top:28px;"><a href="/scanner" style="background:rgba(0,255,136,0.12);border:1px solid var(--green);color:var(--green);padding:10px 28px;border-radius:8px;font-family:Orbitron,monospace;font-size:12px;text-decoration:none;letter-spacing:1px;"><i class="fas fa-search me-2"></i>SCAN ANOTHER EMAIL</a></div>'
    + '</div>'
  );
  setTimeout(function () { container.find('.reveal').addClass('visible'); }, 100);
}

// =========================================================
//  EDIT PROFILE MODAL
// =========================================================
function openEditProfile() {
  // Refresh values from current DOM (already populated by API call)
  $('#edit-profile-error').hide().text('');
  $('#edit-profile-modal').css('display', 'flex').hide().fadeIn(200);
}

function closeEditProfile() {
  $('#edit-profile-modal').fadeOut(200);
  $('#edit-profile-error').hide();
}

// Close modal when clicking backdrop
$(document).on('click', '#edit-profile-modal', function (e) {
  if ($(e.target).is('#edit-profile-modal')) closeEditProfile();
});

// Allow Enter key in username input
$(document).on('keydown', '#edit-username-input', function (e) {
  if (e.key === 'Enter') saveProfile();
});

function saveProfile() {
  var newUsername = $('#edit-username-input').val().trim();
  var errDiv = $('#edit-profile-error');

  errDiv.hide();
  if (!newUsername) { errDiv.text('Username cannot be empty.').show(); return; }
  if (newUsername.length < 3) { errDiv.text('Username must be at least 3 characters.').show(); return; }

  var btn = $('#save-profile-btn');
  btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i> Saving...');

  $.ajax({
    url: '/api/update-profile',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ username: newUsername }),
    success: function (res) {
      if (res.success) {
        var initials = newUsername.charAt(0).toUpperCase();

        // Update every place that shows username
        $('#sidebar-avatar, #nav-avatar, #dropdown-avatar, #profile-big-avatar').text(initials);
        $('#sidebar-username, #nav-username, #dropdown-name, #profile-card-name, #pi-name').text(newUsername);
        $('#welcome-name').text(newUsername + '! \uD83D\uDC4B');

        // Re-sync the edit field
        $('#edit-username-input').val(newUsername);

        closeEditProfile();
        showToast('\u2713 Profile updated successfully!', 'success');
      } else {
        errDiv.text(res.error || 'Failed to save. Please try again.').show();
      }
    },
    error: function (xhr) {
      var msg = (xhr.responseJSON && xhr.responseJSON.error) ? xhr.responseJSON.error : 'Server error. Please try again.';
      errDiv.text(msg).show();
    },
    complete: function () {
      btn.prop('disabled', false).html('<i class="fas fa-save me-1"></i> Save Changes');
    }
  });
}

// =========================================================
//  HELPERS
// =========================================================
function animateCounter(id, target) {
  var el = document.getElementById(id);
  if (!el) return;
  var cur = 0, steps = 40, inc = Math.max(target / steps, 1);
  var t = setInterval(function () {
    cur += inc;
    if (cur >= target) { cur = target; clearInterval(t); }
    el.textContent = Math.floor(cur);
  }, 30);
}

function showTab(tab) {
  $('.dash-tab').hide();
  $('#tab-' + tab).show();
  $('.sidebar-link').removeClass('active');
  $('.sidebar-link[onclick*="' + tab + '"]').addClass('active');
  window.scrollTo(0, 0);
  if(tab === 'support') {
        loadSupportTickets();
    }
}

function filterHistory(type, btn) {
  $('.hf-btn').removeClass('active');
  $(btn).addClass('active');
  if (type === 'all') {
    $('#full-history-body tr').show();
  } else if (type === 'breach') {
    $('#full-history-body tr').each(function () { $(this).toggle($(this).text().includes('BREACH')); });
  } else {
    $('#full-history-body tr').each(function () { $(this).toggle($(this).text().includes('SAFE')); });
  }
}

function toggleSetting(el) {
  $(el).toggleClass('active');
  var label = $(el).closest('.security-toggle-row').find('.st-label').text();
  var on = $(el).hasClass('active');
  showToast((on ? '\u2713 Enabled: ' : 'Disabled: ') + label, on ? 'success' : 'error');
}
// =========================================================
//  DOWNLOAD REPORT (PDF)
// =========================================================
function downloadReport() {
  // kept for backward compatibility — downloads full report
  showToast('Generating your full security report...', 'success');
  window.location.href = '/api/download-report/all';
}

function downloadScanReport(scanId) {
  showToast('Generating report for this scan...', 'success');
  window.location.href = '/api/download-report/' + scanId;
}

// =========================================================
//  SUPPORT / QUERIES (TICKETS)
// =========================================================
function submitTicket() {
  var subject = $('#ticket-subject').val().trim();
  var message = $('#ticket-message').val().trim();
  var errDiv  = $('#ticket-error');

  errDiv.hide();
  if (!subject) { errDiv.text('Subject is required.').show(); return; }
  if (!message || message.length < 5) { errDiv.text('Please describe your query in more detail.').show(); return; }

  var btn = $('#submit-ticket-btn');
  btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Submitting...');

  $.ajax({
    url: '/api/support-tickets',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ subject: subject, message: message }),
    success: function (res) {
      if (res.success) {
        $('#ticket-subject').val('');
        $('#ticket-message').val('');
        showToast('\u2713 Query submitted! We will get back to you soon.', 'success');
        loadSupportTickets();
      } else {
        errDiv.text(res.error || 'Failed to submit query.').show();
      }
    },
    error: function (xhr) {
      var msg = (xhr.responseJSON && xhr.responseJSON.error) ? xhr.responseJSON.error : 'Server error. Please try again.';
      errDiv.text(msg).show();
    },
    complete: function () {
      btn.prop('disabled', false).html('<i class="fas fa-paper-plane"></i> Submit Query');
    }
  });
}

function loadSupportTickets() {
  var list = $('#tickets-list');
  $.ajax({
    url: '/api/support-tickets',
    method: 'GET',
    success: function (data) {
      renderTickets(data.tickets || []);
    },
    error: function () {
      list.html('<div class="no-data" style="padding:32px;text-align:center;">Failed to load your queries.</div>');
    }
  });
}

function renderTickets(tickets) {
  var list = $('#tickets-list');
  list.empty();

  if (tickets.length === 0) {
    list.html(
      '<div class="no-data" style="padding:32px;text-align:center;">'
      + '<i class="fas fa-inbox" style="font-size:28px;color:var(--text-muted);margin-bottom:10px;display:block;"></i>'
      + 'No queries submitted yet. Use the form to ask us anything.'
      + '</div>'
    );
    return;
  }

  tickets.forEach(function (t) {
    var statusClass = t.status === 'ANSWERED' ? 'ticket-status-answered' : 'ticket-status-open';
    var statusLabel = t.status === 'ANSWERED' ? '\u2713 ANSWERED' : '\u23F3 PENDING';
    var dateStr = t.created_at ? toIST(t.created_at) : '';

    var replyHtml = '';
    if (t.status === 'ANSWERED' && t.admin_reply) {
      replyHtml =
        '<div class="ticket-reply">'
        + '<div class="ticket-reply-label"><i class="fas fa-shield-alt"></i> IDENTITYSHIELD SUPPORT</div>'
        + '<div class="ticket-reply-text">' + escapeHtmlTicket(t.admin_reply) + '</div>'
        + '</div>';
    }

    var card = $(
      '<div class="ticket-card">'
      + '  <div class="ticket-card-top">'
      + '    <div class="ticket-subject">' + escapeHtmlTicket(t.subject) + '</div>'
      + '    <span class="ticket-status ' + statusClass + '">' + statusLabel + '</span>'
      + '  </div>'
      + '  <div class="ticket-message">' + escapeHtmlTicket(t.message) + '</div>'
      + '  <div class="ticket-date"><i class="fas fa-clock me-1"></i>' + dateStr + '</div>'
      + replyHtml
      + '</div>'
    );
    list.append(card);
  });
}

// Simple HTML escape to prevent XSS when rendering user-submitted ticket text
function escapeHtmlTicket(str) {
  if (!str) return '';
  return $('<div>').text(str).html();
}
// =========================================================
//  TOAST NOTIFICATION (safe fallback if not in main.js)
// =========================================================
if (typeof showToast === 'undefined') {
  window.showToast = function(message, type) {
    var toast = $('#toast-notification');
    if (!toast.length) {
      $('body').append('<div id="toast-notification" class="toast-notify"><div class="toast-icon" id="toast-icon">✓</div><div class="toast-msg" id="toast-msg"></div></div>');
      toast = $('#toast-notification');
    }
    toast.removeClass('success error info');
    $('#toast-icon').html(type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ');
    $('#toast-msg').text(message);
    toast.addClass(type || 'success').addClass('show');
    setTimeout(function() { toast.removeClass('show'); }, 3000);
  };
}