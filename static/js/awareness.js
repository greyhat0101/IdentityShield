// ═════════════════════════════════════════════════════════════════════════════
// AWARENESS PAGE - ENHANCED VERSION WITH ALL SECTIONS FULLY IMPLEMENTED
// ═════════════════════════════════════════════════════════════════════════════

let allArticles = [];
let currentFilter = 'all';

$(document).ready(function(){
  console.log('=== AWARENESS PAGE LOADING ===');
  
  // Canvas Animation
  var c=document.getElementById('awareness-canvas');
  if(c){
    var ctx=c.getContext('2d'),W,H,pts=[];
    function resize(){W=c.width=c.offsetWidth;H=c.height=c.offsetHeight;}
    resize();
    window.addEventListener('resize',resize);
    
    for(var i=0;i<50;i++)
      pts.push({
        x:Math.random()*1200,
        y:Math.random()*400,
        vx:(Math.random()-.5)*.3,
        vy:(Math.random()-.5)*.3,
        r:Math.random()+.5,
        a:Math.random()*.3+.1
      });
    
    function draw(){
      ctx.clearRect(0,0,W,H);
      pts.forEach(function(p){
        p.x+=p.vx;
        p.y+=p.vy;
        if(p.x<0||p.x>W)p.vx*=-1;
        if(p.y<0||p.y>H)p.vy*=-1;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle='rgba(0,255,136,'+p.a+')';
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    draw();
  }

  // Scroll Reveal
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting)e.target.classList.add('visible');
    });
  },{threshold:.1});
  
  document.querySelectorAll('.reveal').forEach(function(el){
    obs.observe(el);
  });

  // Load ALL content - Sequential loading for better performance
  loadNews();
  loadTickerAlerts();
  
  setTimeout(function(){
    loadSecurityTips();
    loadCommonThreats();
    updateChecklistProgress();
  }, 500);
  
  console.log('=== PAGE INITIALIZED ===');
});


/**
 * Load ticker alerts
 */
function loadTickerAlerts(){
  $.ajax({
    url:'/api/news',
    method:'GET',
    timeout:10000,
    dataType:'json',
    success:function(data){
      if(data.success && data.articles && data.articles.length > 0){
        var articles = data.articles.slice(0, 5);
        var ticker = $('#alert-ticker');
        ticker.empty();
        
        articles.forEach(function(article){
          var title = article.title ? escapeHtml(article.title).substring(0, 80) : 'Security Alert';
          ticker.append('<span>⚠️ ' + title + '</span>');
        });

        var tickerContent = ticker.html();
        ticker.html(tickerContent + tickerContent);
      }
    },
    error:function(){
      console.log('Ticker load failed');
    }
  });
}


/**
 * Load news from API
 */
function loadNews(){
  $('#news-loading').show();
  $('#news-grid').empty().hide();
  $('#news-error').hide();

  $.ajax({
    url:'/api/news',
    method:'GET',
    timeout:10000,
    dataType:'json',
    success:function(data){
      $('#news-loading').hide();

      if(data.success && data.articles && data.articles.length > 0){
        allArticles = data.articles;
        renderNews(allArticles);
      } else {
        showNewsError('No articles available');
      }
    },
    error:function(xhr, status, error){
      $('#news-loading').hide();
      var errorMsg = 'Could not load news';
      if(status === 'timeout') errorMsg = 'Request timed out';
      showNewsError(errorMsg);
    }
  });
}


/**
 * Render news articles
 */
function renderNews(articles){
  var grid = $('#news-grid');
  grid.empty().show();

  if(!articles || articles.length === 0){
    grid.html('<div class="col-12 text-center" style="color: var(--text-muted); padding: 40px 20px;">No articles found.</div>');
    return;
  }

  articles.slice(0, 9).forEach(function(article, index){
    var title = article.title ? escapeHtml(article.title) : 'Untitled';
    var description = article.description ? escapeHtml(article.description) : 'No description';
    var source = article.source && article.source.name ? article.source.name : 'CyberNews';
    var url = article.url || '#';
    var imageUrl = article.urlToImage || null;
    var publishedAt = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-IN', {
      day:'numeric',
      month:'short',
      year:'numeric'
    }) : 'Unknown';

    if(description.length > 120) description = description.substring(0, 120) + '...';
    if(title.length > 80) title = title.substring(0, 80) + '...';

    var imageHtml = '';
    if(imageUrl){
      imageHtml = '<img src="' + imageUrl + '" class="news-card-img" alt="news" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">';
      imageHtml += '<div class="news-card-img-placeholder" style="display:none;">📰</div>';
    } else {
      imageHtml = '<div class="news-card-img-placeholder">📰</div>';
    }

    var cardHtml = 
      '<div class="col-md-6 col-lg-4 reveal reveal-delay-' + (index % 3) + '">' +
        '<div class="news-card">' +
          '<div class="news-card-image">' + imageHtml + '</div>' +
          '<div class="news-card-body">' +
            '<div class="news-card-source">' + source + '</div>' +
            '<div class="news-card-title">' + title + '</div>' +
            '<div class="news-card-desc">' + description + '</div>' +
            '<div class="d-flex justify-content-between align-items-center">' +
              '<div class="news-card-date">' + publishedAt + '</div>' +
              '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="news-card-link">Read <i class="fas fa-external-link-alt"></i></a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    grid.append(cardHtml);
  });

  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting) e.target.classList.add('visible');
    });
  },{threshold:.1});
  
  document.querySelectorAll('#news-grid .reveal').forEach(function(el){
    obs.observe(el);
  });
}


/**
 * SECTION 1: Load Security Tips
 */
function loadSecurityTips(){
  var tipsHtml = '';
  var tips = [
    {
      icon: '🔐',
      title: 'Strong Passwords',
      desc: 'Use 12+ characters with uppercase, lowercase, numbers & symbols. Never reuse passwords.'
    },
    {
      icon: '📱',
      title: 'Enable 2FA/MFA',
      desc: 'Add a second layer of security to all important accounts. Use authenticator apps.'
    },
    {
      icon: '🔗',
      title: 'HTTPS Only',
      desc: 'Always look for the padlock icon when entering sensitive data. Avoid HTTP sites.'
    },
    {
      icon: '⚠️',
      title: 'Phishing Awareness',
      desc: 'Hover over links before clicking. Check sender email carefully. Never share passwords.'
    },
    {
      icon: '🔄',
      title: 'Regular Updates',
      desc: 'Keep OS, browsers & apps updated. Enable automatic security patches.'
    },
    {
      icon: '📞',
      title: 'Verify Requests',
      desc: 'Banks never ask for passwords via email. Verify caller identity before sharing info.'
    }
  ];

  tips.forEach(function(tip, idx){
    tipsHtml += '<div class="col-md-6 col-lg-4 reveal reveal-delay-' + (idx % 3) + '"><div class="tip-card"><div class="tip-icon">' + tip.icon + '</div><div class="tip-title">' + tip.title + '</div><div class="tip-desc">' + tip.desc + '</div></div></div>';
  });

  $('#tips-container').html(tipsHtml);
}

    

/**
 * SECTION 3: Load Common Threats
 */
function loadCommonThreats(){
  var threatsHtml = '';
  var threats = [
    {
      icon: <i class="fas fa-shield-virus"></i>,
      name: 'Ransomware',
      desc: 'Malware that encrypts your files and demands payment for decryption.',
      protection: 'Keep backups. Don\'t pay ransom. Report to authorities.'
    },
    {
      icon: '🎣',
      name: 'Phishing',
      desc: 'Fraudulent emails/messages pretending to be from trusted organizations.',
      protection: 'Verify sender email. Check URLs. Never click suspicious links.'
    },
    {
      icon: '💔',
      name: 'Data Breach',
      desc: 'Unauthorized access to databases exposing personal information.',
      protection: 'Monitor accounts. Change passwords. Use breach notification services.'
    },
    {
      icon: '☠️',
      name: 'Malware',
      desc: 'Malicious software designed to damage or disable computers.',
      protection: 'Use antivirus. Update software. Don\'t download from untrusted sources.'
    },
    {
      icon: '🔗',
      name: 'Man-in-the-Middle',
      desc: 'Attacker intercepts communication between two parties.',
      protection: 'Use VPN. Verify SSL certificates. Avoid public WiFi.'
    },
    {
      icon: '🤖',
      name: 'Credential Stuffing',
      desc: 'Using leaked credentials to access multiple accounts.',
      protection: 'Use unique passwords. Enable 2FA. Monitor for breaches.'
    }
  ];

  threats.forEach(function(threat){
    threatsHtml += '<div class="col-md-6 col-lg-4"><div class="threat-card"><div class="threat-header"><span class="threat-icon">' + threat.icon + '</span><h4 class="threat-name">' + threat.name + '</h4></div><p class="threat-desc"><strong>What it is:</strong> ' + threat.desc + '</p><p class="threat-protection"><strong>How to protect:</strong> ' + threat.protection + '</p></div></div>';
  });

  $('#threats-container').html(threatsHtml);
}


    

/**
 * Filter news
 */
function filterNews(type, btn){
  $('.af-btn').removeClass('active');
  $(btn).addClass('active');
  
  currentFilter = type;
  
  if(type === 'all'){
    renderNews(allArticles);
    return;
  }

  var filtered = allArticles.filter(function(article){
    var text = (article.title + ' ' + article.description).toLowerCase();
    
    switch(type){
      case 'breach':
        return text.includes(' data breach') || text.includes('leak') || text.includes('exposed') || text.includes('hacked') || text.includes('compromised');
      case 'ransomware':
        return text.includes('ransomware') || text.includes('ransom') || text.includes('encrypt') || text.includes('malware');
      case 'vulnerability':
        return text.includes('malware') || text.includes('cve') || text.includes('zero day') || text.includes('exploit') || text.includes('patch');
      case 'phishing':
        return text.includes('phishing') || text.includes('spam') || text.includes('email') || text.includes('scam');
      default:
        return true;
    }
  });

  renderNews(filtered);
}


/**
 * Show error message
 */
function showNewsError(message){
  var errorHtml = 
    '<div class="col-12">' +
      '<div class="news-error-wrap">' +
        '<div class="news-error-icon">⚠️</div>' +
        '<div class="news-error-title">Unable to Load News</div>' +
        '<div class="news-error-desc">' + escapeHtml(message) + '</div>' +
      '</div>' +
    '</div>';
  
  $('#news-error').html(errorHtml).show();
}


/**
 * Escape HTML
 */
function escapeHtml(text){
  var map = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}


/**
 * Toggle checklist
 */
function toggleCheck(el){
  $(el).toggleClass('checked');
  updateChecklistProgress();
}


/**
 * Update checklist progress
 */
function updateChecklistProgress(){
  var total = $('.checklist-item').length;
  var checked = $('.checklist-item.checked').length;
  var percentage = total > 0 ? Math.round((checked / total) * 100) : 0;
  
  $('#checklist-percent').text(percentage + '%');
  $('#checklist-bar').css('width', percentage + '%');
}


/**
 * Show toast
 */
function showToast(message, type){
  var toast = $('#toast-notification');
  var icon = $('#toast-icon');
  var msg = $('#toast-msg');
  
  if(type === 'success'){
    icon.html('✓').css('color', '#00ff88');
  } else if(type === 'error'){
    icon.html('✕').css('color', '#ff4757');
  } else {
    icon.html('⚠').css('color', '#ffa502');
  }
  
  msg.text(message);
  toast.fadeIn(200);
  
  setTimeout(function(){
    toast.fadeOut(200);
  }, 3000);
}
