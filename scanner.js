$(document).ready(function(){
  // Canvas background
  var c=document.getElementById('scan-canvas');
  if(c){var ctx=c.getContext('2d'),W,H,pts=[];
    function resize(){W=c.width=c.offsetWidth;H=c.height=c.offsetHeight;}
    resize();window.addEventListener('resize',resize);
    for(var i=0;i<60;i++)pts.push({x:Math.random()*1200,y:Math.random()*400,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()+.5,a:Math.random()*.4+.1});
    function draw(){ctx.clearRect(0,0,W,H);pts.forEach(function(p){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(0,212,255,'+p.a+')';ctx.fill();});requestAnimationFrame(draw);}
    draw();
  }

  // Platform selection
  $('.platform-chip').on('click',function(){
    $('.platform-chip').removeClass('selected');
    $(this).addClass('selected');
  });

  // Show/hide clear button
  $('#scan-email').on('input',function(){
    $('#scan-clear').css('display',$(this).val()?'block':'none');
  });

  // Reveal on scroll
  var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});
});

function clearScanInput(){$('#scan-email').val('');$('#scan-clear').hide();$('#scan-email').focus();}

function startScan(){
  var email=$('#scan-email').val().trim();
  if(!email){showToast('Please enter an email address','error');$('#scan-email').focus();return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showToast('Please enter a valid email address','error');return;}

  var platform = $('.platform-chip.selected').data('platform') || ''; 
  $('#scan-form-section').hide();
  $('#result-safe,#result-breach,#scan-again').hide();
  $('#scan-loading').show();

  // Step animation
  var steps=['lstep1','lstep2','lstep3'];
  var si=0;
  var stepTimer=setInterval(function(){
    if(si>0)$('#'+steps[si-1]).removeClass('active').addClass('done');
    if(si<steps.length){$('#'+steps[si]).addClass('active');si++;}
    else{clearInterval(stepTimer);}
  },900);

  // Call Flask API
  setTimeout(function(){
    $.ajax({
      url:'/api/scan',
      method:'POST',
      contentType:'application/json',
      data:JSON.stringify({email:email, platform:platform}),
      success:function(data){
        clearInterval(stepTimer);
        $('#scan-loading').hide();
        if(data.success)
			{showResults(email,data);}
        else
			{showError(data.error||'Scan failed');}
      },
      error:function(xhr){
        clearInterval(stepTimer);
        $('#scan-loading').hide();
        if (xhr.status===401) {
			window.location.href = '/';
		return;
		}
		showError(xhr.responseJSON?.error || "Scan failed !! Please Try again.")
      }
    });
  },2800);
}

function showResults(email, data)
{
	var breach_count = data.breach_count || 0;
	var risk_score = data.risk_score || 0;
	var risk_level = data.risk_level || 'None';
	var breaches = data.breaches || [];
	var platform = data.platform || 'all';

	if (breach_count === 0)
	{
		$('#safe-email-shown').text(platform !== 'all' ? email + 'on' + platform: email);
		$('#safe-score').text(risk_score + '/100');
		$('#result-safe').show();
		setTimeout(function() {$('#safe-bar').css('width', Math.max(risk_score, 2) + '%'); }, 200);
	}
	else{
		$('#breach-email-shown').text(platform !== 'all' ? email + 'on' + platform: email);

		//stats row
		var total_records = breaches.reduce(function(sum, b)
		{ return sum + (parseInt(b.records_exposed) || 0); }, 0);

		animateNum('breach-count-display', breach_count);
		animateNum('breach-records-display', total_records);
		$('#breach-score-display').text(risk_score + '/100');
		$('#breach-score').text(risk_score + '/100');

		//risk bar color
		var color = risk_score >= 80
			? 'linear-gradient(90deg, #ff4757, #ff0000)' : risk_score >= 50
				? 'linear-gradient(90deg, #ffa502, #ff6b35)' 
				: 'linear-gradient(90deg, #ffd32a, #ffa502)';
		$('#breach-bar').css('background', color);
		setTimeout(function() {$('#breach-bar').css('width', risk_score + '%');}, 200);

		 // risk tag
		var riskLabels = {
		'NONE':     '⚪ NO RISK',
		'LOW':      '🟢 LOW RISK',
		'MEDIUM':   '🟡 MEDIUM RISK',
		'HIGH':     '🔴 HIGH RISK',
		'CRITICAL': '🔴 CRITICAL RISK'
		};
		$('#risk-tag').text(riskLabels[risk_level] || '🔴 HIGH RISK');

		// breach cards — one per breach with details
    var html = '';
    breaches.forEach(function(b){
      var exposed = Array.isArray(b.exposed_data)
        ? b.exposed_data.join(', ')
        : (b.exposed_data || 'Unknown');

      html += '<div class="breach-site-chip" title="' + (b.description || '') + '">'
            +   '<i class="fas fa-exclamation-circle me-1"></i>'
            +   '<strong>' + (b.name || 'Unknown') + '</strong>'
            +   (b.domain    ? ' <span class="breach-domain">(' + b.domain + ')</span>' : '')
            +   (b.breach_date ? ' <span class="breach-date">· ' + b.breach_date + '</span>' : '')
            +   '<br><small class="breach-exposed">Exposed: ' + exposed + '</small>'
            + '</div>';
    });
    $('#breached-sites-list').html(html || '<span>Details unavailable</span>');
    $('#result-breach').show();
  }

  // show scan again button and scroll to results
  $('#scan-again').show();
  $('html,body').animate({
    scrollTop: $('#result-safe:visible,#result-breach:visible').offset().top - 100
  }, 600);
}	
	
	

// function simulateResult(email){
//   // Demo: emails with 'test' or 'demo' = safe, others = breach
//   var safe=email.includes('test')||email.includes('demo');
//   if(safe){return{success:true,email:email,breach_count:0,risk_level:'LOW',risk_score:5};}
//   return{success:true,email:email,breach_count:3,risk_level:'HIGH',risk_score:75,
//     ExposedBreaches:{breaches_details:[{breach:'LinkedIn'},{breach:'Adobe'},{breach:'Dropbox'}]}};
// }

// function showResults(email,data){
//   if(data.breach_count===0){
//     $('#safe-email-shown').text(email);
//     $('#result-safe').show();
//     setTimeout(function(){$('#safe-bar').css('width','5%');},200);
//   } else {
//     $('#breach-email-shown').text(email);
//     var score=data.risk_score||75;
//     var count=data.breach_count||0;
//     var sites=[];
//     if(data.ExposedBreaches&&data.ExposedBreaches.breaches_details){
//       sites=data.ExposedBreaches.breaches_details.map(function(b){return b.breach||b;});
//     } else if(data.data&&data.data.ExposedBreaches){
//       sites=data.data.ExposedBreaches.breaches_details.map(function(b){return b.breach||b;});
//     }
    // animateNum('breach-count-display',count);
    // animateNum('breach-records-display',count*Math.floor(Math.random()*5000000+1000000));
    // $('#breach-score-display').text(score+'/100');
    // $('#breach-score').text(score+'/100');
    // var riskColors={'LOW':'🟢 LOW RISK','MEDIUM':'🟡 MEDIUM RISK','HIGH':'🔴 HIGH RISK','CRITICAL':'🔴 CRITICAL RISK'};
    // $('#risk-tag').text(riskColors[data.risk_level]||'🔴 HIGH RISK');
    // var list=sites.length?sites:['LinkedIn','Adobe','Dropbox'];
    // var html='';list.forEach(function(s){html+='<span class="breach-site-chip"><i class="fas fa-exclamation-circle me-1"></i>'+s+'</span>';});
    // $('#breached-sites-list').html(html);
    // Color breach bar
//     var color=score>=80?'linear-gradient(90deg,#ff4757,#ff0000)':score>=50?'linear-gradient(90deg,#ffa502,#ff6b35)':'linear-gradient(90deg,#ffd32a,#ffa502)';
//     $('#breach-bar').css('background',color);
//     $('#result-breach').show();
//     setTimeout(function(){$('#breach-bar').css('width',score+'%');},200);
//   }
//   $('#scan-again').show();
//   $('html,body').animate({scrollTop:$('#result-safe:visible,#result-breach:visible').offset().top-100},600);
// }

function animateNum(id,target){
  var el=document.getElementById(id);if(!el)return;
  var cur=0,steps=50,inc=target/steps;
  var t=setInterval(function(){cur+=inc;if(cur>=target){cur=target;clearInterval(t);}
    el.textContent=Math.floor(cur).toLocaleString();},30);
}

function showError(msg){
  showToast(msg,'error');
  $('#scan-form-section').show();
}

function resetScanner(){
  $('#result-safe,#result-breach,#scan-again').hide();
  $('#scan-form-section').show();
  $('#scan-email').val('');
  $('#scan-clear').hide();
  $('.platform-chip').removeClass('selected');
  $('.loading-step').removeClass('active done');
  $('html,body').animate({scrollTop:0},400);
}


