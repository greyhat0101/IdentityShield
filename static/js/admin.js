// ═══════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function logoutUser() { window.location.href = '/logout'; }

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════
$(document).ready(function () {
  updateClock();
  setInterval(updateClock, 1000);
  loadChartsFromBackend();

  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });

  loadActivityFeed();

  // Close sidebar on outside click (mobile)
  $(document).on('click', function (e) {
    if (!$(e.target).closest('#admin-sidebar, .hamburger').length) {
      if (window.innerWidth < 992) $('#admin-sidebar').removeClass('show');
    }
  });

  // Close profile dropdown on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.btn-profile') && !e.target.closest('#profile-dropdown')) {
      closePD();
    }
  });

  // Close modals on backdrop click
  $(document).on('click', '#msg-modal', function (e) {
    if ($(e.target).is('#msg-modal')) closeMsgModal();
  });
  $(document).on('click', '#ticket-reply-modal', function (e) {
    if ($(e.target).is('#ticket-reply-modal')) closeTicketModal();
  });
});

// ═══════════════════════════════════════════════════════════════
// PROFILE DROPDOWN
// ═══════════════════════════════════════════════════════════════
function toggleProfileDropdown() {
  var dd = document.getElementById('profile-dropdown');
  var isOpen = dd.classList.contains('open');
  dd.classList.toggle('open');
  var chevron = document.querySelector('.btn-profile .fa-chevron-down');
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function closePD() {
  var dd = document.getElementById('profile-dropdown');
  if (dd) dd.classList.remove('open');
  var chevron = document.querySelector('.btn-profile .fa-chevron-down');
  if (chevron) chevron.style.transform = 'rotate(0deg)';
}

// ═══════════════════════════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════════════════════════
function updateClock() {
  var now = new Date();
  var el = document.getElementById('admin-time');
  if (el) el.textContent = now.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' }) + '  ' + now.toLocaleTimeString();
}

// ═══════════════════════════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════════════════════════
function loadChartsFromBackend() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.color = '#8a9ab0';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';

  $.getJSON('/api/chart-data', function (data) {
    // Daily Scans line chart
    var dailyCtx = document.getElementById('chart-daily-scans');
    if (dailyCtx) {
      var labels = data.scans_by_day.map(function (r) { return r.day; }).reverse();
      var counts = data.scans_by_day.map(function (r) { return r.count; }).reverse();

	  if (window._dailyChart) {
    window._dailyChart.destroy();
	}
     window._dailyChart = new Chart(dailyCtx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label:'Scans', data:counts, borderColor:'#00ff88', backgroundColor:'rgba(0,255,136,0.08)', borderWidth:2, pointBackgroundColor:'#00ff88', pointRadius:4, tension:0.4, fill:true }] },
        options: {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' } },
        y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            beginAtZero: true,
            ticks: {
                stepSize: 1,
                precision: 0
            }
        }
    }
}       
      });
    }

    // Risk Distribution pie
	if (!data.risk_dist || data.risk_dist.length === 0) {
    $('#pie-legend').html('<div style="color:#8a9ab0;font-size:12px;text-align:center;">No scan data yet.</div>');
	}	
	
	else {

			var pieCtx = document.getElementById('chart-risk-pie');
			if (pieCtx) {
			var riskOrder  = ['LOW','MEDIUM','HIGH','CRITICAL','NONE'];
		var riskColors = { LOW:'rgba(0,255,136,0.8)', MEDIUM:'rgba(255,165,0,0.8)', HIGH:'rgba(255,71,87,0.8)', CRITICAL:'rgba(192,132,252,0.8)', NONE:'rgba(255,255,255,0.2)' };
      var riskMap = {};
      data.risk_dist.forEach(function (r) { riskMap[r.level] = r.count; });
      var pieLabels=[], pieData=[], pieColors=[];
      riskOrder.forEach(function (l) { if (riskMap[l] !== undefined) { pieLabels.push(l); pieData.push(riskMap[l]); pieColors.push(riskColors[l]); } });
   
	  if (window._pieChart) {
    window._pieChart.destroy();
	  }
     window._pieChart =  new Chart(pieCtx, {
        type: 'doughnut',
        data: { labels:pieLabels, datasets:[{ data:pieData, backgroundColor:pieColors, borderColor:'#0a0f1e', borderWidth:3 }] },
        options: { responsive:true, maintainAspectRatio:true, cutout:'65%', plugins:{ legend:{ display:false } } }
      });
      var lg = $('#pie-legend'); lg.empty();
      pieLabels.forEach(function (label, i) {
        var total = pieData.reduce(function(a,b){ return a+b; }, 0);
        var pct = total > 0 ? Math.round((pieData[i]/total)*100) : 0;
        lg.append('<div class="pie-legend-item"><div class="pie-dot" style="background:' + pieColors[i] + '"></div>' + label + ' (' + pct + '%)</div>');
      });
    }
	}
  }).fail(function () { initChartsFallback(); });

  initStaticCharts();
}

function initStaticCharts() {
    var realData = window.ADMIN_DATA || { topPlatforms: [], monthlyUsers: [] };
    var platformColors = {
        'LinkedIn': 'rgba(10,102,194,0.7)',
        'Facebook': 'rgba(66,103,178,0.7)',
        'Adobe':    'rgba(250,30,0,0.7)',
        'Yahoo':    'rgba(97,0,186,0.7)',
        'Dropbox':  'rgba(0,97,255,0.7)',
        'Twitter':  'rgba(29,161,242,0.7)'
    };

    // Top Platforms bar — dashboard tab
    var barCtx = document.getElementById('chart-platforms');
    if (barCtx) {
        var labels = realData.topPlatforms.length ? realData.topPlatforms.map(function(p){ return p[0]; }) : ['No data'];
        var counts = realData.topPlatforms.length ? realData.topPlatforms.map(function(p){ return p[1]; }) : [0];
        var colors = labels.map(function(l){ return platformColors[l] || 'rgba(0,212,255,0.6)'; });
        new Chart(barCtx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ data: counts, backgroundColor: colors, borderRadius: 4 }] },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
                }
            }
        });
    }

    // Monthly Users bar — users tab
    var muTabCtx = document.getElementById('chart-monthly-users-tab');
    if (muTabCtx) {
        var muL = realData.monthlyUsers.length ? realData.monthlyUsers.map(function(m){ return m[0]; }) : ['No data'];
        var muC = realData.monthlyUsers.length ? realData.monthlyUsers.map(function(m){ return m[1]; }) : [0];
        new Chart(muTabCtx, {
            type: 'bar',
            data: {
                labels: muL,
                datasets: [{
                    label: 'New Users',
                    data: muC,
                    backgroundColor: 'rgba(0,212,255,0.6)',
                    borderColor: '#00d4ff',
                    borderWidth: 1,
                    borderRadius: 4,
					barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, offset: true},
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        beginAtZero: true,
                        ticks: { stepSize: 1, precision: 0 }
                    }
                }
            }
        });
    }
}
  

function initChartsFallback() {
  var dailyCtx = document.getElementById('chart-daily-scans');
  if (dailyCtx) {
    new Chart(dailyCtx, { type:'line', data:{ labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], datasets:[{ label:'Scans', data:[0,0,0,0,0,0,0], borderColor:'#00ff88', backgroundColor:'rgba(0,255,136,0.08)', borderWidth:2, pointRadius:4, tension:0.4, fill:true }] }, options:{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{ color:'rgba(255,255,255,0.04)' } }, y:{ grid:{ color:'rgba(255,255,255,0.04)' }, beginAtZero:true } } } });
  }
}
 
   

// ═══════════════════════════════════════════════════════════════
// ACTIVITY FEED — real data from scans table rows
// ═══════════════════════════════════════════════════════════════
function loadActivityFeed() {
  var feed = $('#activity-feed');
  feed.empty();
  var rows = $('#admin-tab-scans table tbody tr');
  if (!rows.length || rows.first().find('td').length === 1) {
    feed.append('<div class="activity-item"><span class="act-time">--</span><span class="act-text scan-act">No activity yet</span></div>');
    return;
  }
  rows.slice(0, 8).each(function () {
    var cells  = $(this).find('td');
    var email  = $(cells[1]).text().trim();
    var date   = $(cells[2]).text().trim();
    var result = $(cells[5]).text().trim();
    var cls = result === 'BREACHED' ? 'breach-act' : 'scan-act';
    var txt = result === 'BREACHED' ? 'Breach detected: ' + email : 'Clean scan: ' + email;
    feed.append('<div class="activity-item"><span class="act-time">' + date + '</span><span class="act-text ' + cls + '">' + txt + '</span></div>');
  });
}

// ═══════════════════════════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════
function showAdminTab(tab, el) {
  $('.admin-tab').hide();
  $('#admin-tab-' + tab).show();
  $('.admin-nav-link').removeClass('active');
  $(el).addClass('active');
  if (window.innerWidth < 992) $('#admin-sidebar').removeClass('show');
  if (tab === 'support') loadAdminTickets();
}

// ═══════════════════════════════════════════════════════════════
// MOBILE SIDEBAR
// ═══════════════════════════════════════════════════════════════
function toggleMobileSidebar() { $('#admin-sidebar').toggleClass('show'); }

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function filterUsers() {
  var q = $('#user-search').val().toLowerCase();
  $('#users-tbody tr').each(function () { $(this).toggle($(this).text().toLowerCase().includes(q)); });
}

function deleteUser(btn) {
  var userId = $(btn).data('id');
  if (!userId) { showToast('Cannot delete: user ID missing', 'error'); return; }
  if (!confirm('Delete this user and all their scans? This cannot be undone.')) return;

  $(btn).prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

  $.ajax({
    url: '/admin/delete_user/' + userId,
    method: 'POST',
    success: function () {
      $(btn).closest('tr').fadeOut(300, function () { $(this).remove(); });
      showToast('User deleted successfully', 'success');
    },
    error: function (xhr) {
      $(btn).prop('disabled', false).html('<i class="fas fa-trash"></i>');
      var msg = (xhr.responseJSON && xhr.responseJSON.error) ? xhr.responseJSON.error : 'Delete failed. Please try again.';
      showToast(msg, 'error');
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// MESSAGES — view full content + mark as read
// ═══════════════════════════════════════════════════════════════
var currentMsgId = null;

function viewMessage(id, btn) {
    var row = $(btn).closest('tr');
    var name    = row.data('msg-name');
    var email   = row.data('msg-email');
    var subject = row.data('msg-subject');
    var message = row.data('msg-message');
    var date    = row.data('msg-date');
    var status  = row.data('msg-status');

    currentMsgId = id;

    $('#msg-modal-body').html(
        '<div style="margin-bottom:12px;">' +
            '<div style="font-size:11px;color:#8a9ab0;font-family:Share Tech Mono,monospace;letter-spacing:1px;margin-bottom:4px;">FROM</div>' +
            '<div style="font-weight:600;color:#fff;">' + name + '</div>' +
            '<div style="color:#00d4ff;font-size:13px;">' + email + '</div>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
            '<div style="font-size:11px;color:#8a9ab0;font-family:Share Tech Mono,monospace;letter-spacing:1px;margin-bottom:4px;">SUBJECT</div>' +
            '<div style="font-weight:600;">' + subject + '</div>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
            '<div style="font-size:11px;color:#8a9ab0;font-family:Share Tech Mono,monospace;letter-spacing:1px;margin-bottom:4px;">DATE</div>' +
            '<div>' + date + '</div>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:14px;">' +
            '<div style="font-size:11px;color:#8a9ab0;font-family:Share Tech Mono,monospace;letter-spacing:1px;margin-bottom:8px;">MESSAGE</div>' +
            '<div>' + message + '</div>' +
        '</div>'
    );

    // clear reply box
    $('#msg-reply-input').val('');
    $('#msg-reply-error').hide();

    // show modal
    $('#msg-modal').css('display', 'flex');

    // mark as read
    if(status === 'unread') {
        $.ajax({
            url: '/admin/message/read/' + id,
            method: 'POST',
            success: function() {
                row.find('.status-chip').removeClass('danger-chip').addClass('active-chip').text('READ');
                row.data('msg-status', 'read');
            }
        });
    }
}

function closeMsgModal() {
    $('#msg-modal').css('display', 'none');
    currentMsgId = null;
}

function sendMsgReply() {
    var reply = $('#msg-reply-input').val().trim();
    if(!reply) {
        $('#msg-reply-error').text('Please type a reply.').show();
        return;
    }

    $('#send-msg-reply-btn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i> Sending...');

    $.ajax({
        url: '/admin/message/reply/' + currentMsgId,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ reply: reply }),
        success: function(res) {
            if(res.success) {
                $('#msg-modal').css('display', 'none');
                showToast('✓ Reply sent successfully!', 'success');
            } else {
                $('#msg-reply-error').text(res.error || 'Failed to send reply.').show();
            }
        },
        error: function() {
            $('#msg-reply-error').text('Server error. Please try again.').show();
        },
        complete: function() {
            $('#send-msg-reply-btn').prop('disabled', false).html('<i class="fas fa-paper-plane me-1"></i> Send Reply');
        }
    });
}


// ═══════════════════════════════════════════════════════════════
// SUPPORT TICKETS — load + reply
// ═══════════════════════════════════════════════════════════════
var _currentTicketId = null;

function loadAdminTickets() {
  var container = $('#admin-tickets-list');
  container.html('<div style="padding:24px;text-align:center;color:#8a9ab0;"><i class="fas fa-spinner fa-spin me-2"></i>Loading tickets...</div>');

  $.ajax({
    url: '/admin/support-tickets',
    method: 'GET',
    success: function (data) {
      container.empty();
      var tickets = data.tickets || [];

      if (!tickets.length) {
        container.html('<div style="padding:32px;text-align:center;color:#8a9ab0;"><i class="fas fa-inbox" style="font-size:28px;display:block;margin-bottom:10px;"></i>No support tickets yet.</div>');
        return;
      }

      var html = '<div class="table-responsive"><table class="admin-table"><thead><tr><th>#</th><th>User</th><th>Email</th><th>Subject</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>';

      tickets.forEach(function (t) {
        var statusHtml = t.status === 'ANSWERED'
          ? '<span class="status-chip active-chip">\u2713 ANSWERED</span>'
          : '<span class="status-chip danger-chip">\u23F3 OPEN</span>';

        html +=
          '<tr>' +
          '<td><span class="uid">#' + t.id + '</span></td>' +
          '<td>' + $('<div>').text(t.username || '').html() + '</td>' +
          '<td>' + $('<div>').text(t.user_email || '').html() + '</td>' +
          '<td>' + $('<div>').text(t.subject).html() + '</td>' +
          '<td>' + (t.created_at ? t.created_at.slice(0,10) : '-') + '</td>' +
          '<td>' + statusHtml + '</td>' +
          '<td class="action-btns"><button class="abt view-btn" onclick=\'viewTicket(' + JSON.stringify(t).replace(/'/g,"\\'") + ')\'><i class="fas fa-eye"></i></button></td>' +
          '</tr>';
      });

      html += '</tbody></table></div>';
      container.html(html);
    },
    error: function () {
      container.html('<div style="padding:24px;text-align:center;color:#ff4757;">Failed to load tickets.</div>');
    }
  });
}

function viewTicket(ticket) {
  _currentTicketId = ticket.id;

  var replySection = '';
  if (ticket.status === 'ANSWERED' && ticket.admin_reply) {
    replySection =
      '<div style="background:rgba(0,212,255,0.06);border-left:3px solid #00d4ff;border-radius:6px;padding:12px 14px;margin-bottom:16px;">' +
      '  <div style="font-size:10px;color:#00d4ff;font-family:Share Tech Mono,monospace;letter-spacing:1px;margin-bottom:6px;"><i class="fas fa-shield-alt"></i> PREVIOUS REPLY</div>' +
      '  <div style="font-size:13px;color:#dde6f0;line-height:1.6;white-space:pre-wrap;">' + $('<div>').text(ticket.admin_reply).html() + '</div>' +
      '</div>';
  }

  $('#ticket-modal-body').html(
    '<div style="margin-bottom:12px;">' +
    '  <div style="font-size:10px;color:#8a9ab0;font-family:Share Tech Mono,monospace;letter-spacing:1px;margin-bottom:4px;">FROM</div>' +
    '  <div style="font-size:15px;font-weight:600;color:#dde6f0;">' + $('<div>').text(ticket.username || '').html() + '</div>' +
    '  <div style="font-size:12px;color:#00d4ff;">' + $('<div>').text(ticket.user_email || '').html() + '</div>' +
    '</div>' +
    '<div style="margin-bottom:12px;">' +
    '  <div style="font-size:10px;color:#8a9ab0;font-family:Share Tech Mono,monospace;letter-spacing:1px;margin-bottom:4px;">SUBJECT</div>' +
    '  <div style="font-size:14px;font-weight:600;color:#dde6f0;">' + $('<div>').text(ticket.subject).html() + '</div>' +
    '</div>' +
    '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;margin-bottom:16px;">' +
    '  <div style="font-size:10px;color:#8a9ab0;font-family:Share Tech Mono,monospace;letter-spacing:1px;margin-bottom:8px;">MESSAGE</div>' +
    '  <div style="font-size:14px;color:#dde6f0;line-height:1.7;white-space:pre-wrap;">' + $('<div>').text(ticket.message).html() + '</div>' +
    '</div>' +
    replySection
  );

  // If already answered, update the label
  if (ticket.status === 'ANSWERED') {
    $('#ticket-reply-section label').first().text('UPDATE REPLY');
    $('#ticket-reply-input').val(ticket.admin_reply || '');
  } else {
    $('#ticket-reply-section label').first().text('YOUR REPLY');
    $('#ticket-reply-input').val('');
  }

  $('#ticket-reply-error').hide();
  $('#ticket-reply-modal').css('display', 'flex');
}

function closeTicketModal() {
  $('#ticket-reply-modal').hide();
  _currentTicketId = null;
}

function sendTicketReply() {
  var reply = $('#ticket-reply-input').val().trim();
  var errDiv = $('#ticket-reply-error');
  errDiv.hide();

  if (!reply) { errDiv.text('Reply cannot be empty.').show(); return; }
  if (!_currentTicketId) { errDiv.text('Ticket ID missing. Please close and reopen.').show(); return; }

  var btn = $('#send-reply-btn');
  btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i> Sending...');

  $.ajax({
    url: '/admin/reply-ticket/' + _currentTicketId,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ reply: reply }),
    success: function (res) {
      if (res.success) {
        closeTicketModal();
        showToast('\u2713 Reply sent! User will see it in their dashboard.', 'success');
        loadAdminTickets();  // refresh the table
      } else {
        errDiv.text(res.error || 'Failed to send reply.').show();
      }
    },
    error: function (xhr) {
      var msg = (xhr.responseJSON && xhr.responseJSON.error) ? xhr.responseJSON.error : 'Server error. Please try again.';
      errDiv.text(msg).show();
    },
    complete: function () {
      btn.prop('disabled', false).html('<i class="fas fa-paper-plane me-1"></i> Send Reply');
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// ARTICLE MANAGEMENT (local only — no backend table yet)
// ═══════════════════════════════════════════════════════════════
//function showAddArticle() { $('#add-article-form').toggle(); clearArticleForm(); }
//function hideAddArticle() { $('#add-article-form').hide(); clearArticleForm(); }
//function clearArticleForm() { $('#article-title,#article-category,#article-content').val(''); $('.article-error').remove(); }

//function validateArticleForm() {
  //$('.article-error').remove();
  //var ok = true;
  //if ($('#article-title').val().trim().length < 3)    { showArticleFieldError('article-title','Title required (min 3 chars)'); ok=false; }
  //if ($('#article-category').val().trim().length < 2) { showArticleFieldError('article-category','Category required'); ok=false; }
  //if ($('#article-content').val().trim().length < 10) { showArticleFieldError('article-content','Content required (min 10 chars)'); ok=false; }
  //return ok;
//}
//function showArticleFieldError(id, msg) {
  //$('#'+id).after('<div class="article-error" style="color:#ff4757;font-size:11px;margin-top:4px;"><i class="fas fa-exclamation-circle me-1"></i>'+msg+'</div>');
//}
//function saveArticle() {
  //if (!validateArticleForm()) return;
  //var title    = $('#article-title').val().trim();
  //var category = $('#article-category').val().trim();
  //var today    = new Date().toLocaleDateString('en-IN',{month:'short',day:'numeric'});
  //$('#articles-tbody').prepend(
    //'<tr><td>'+$('<div>').text(title).html()+'</td><td><span class="platform-tag">'+$('<div>').text(category).html()+'</span></td><td>'+today+'</td><td><span class="status-chip active-chip">Published</span></td>' +
    //'<td class="action-btns"><button class="abt edit-btn"><i class="fas fa-edit"></i></button><button class="abt del-btn" onclick="$(this).closest(\'tr\').fadeOut(300,function(){$(this).remove();});showToast(\'Article deleted\',\'success\');"><i class="fas fa-trash"></i></button></td></tr>'
  //);
  //hideAddArticle();
  //showToast('Article saved!','success');
//}

// ═══════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
function showToast(message, type) {
  type = type || 'success';
  var toast = $('#toast-notification');
  var icon  = $('#toast-icon');
  toast.removeClass('success error info');
  if (type === 'success')    { icon.html('✓'); toast.addClass('success'); }
  else if (type === 'error') { icon.html('✕'); toast.addClass('error'); }
  else                       { icon.html('ℹ'); toast.addClass('info'); }
  $('#toast-msg').text(message);
  toast.addClass('show');
  setTimeout(function () { toast.removeClass('show'); }, 3500);
}
