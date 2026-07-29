

$(document).ready(function(){
  // Canvas for about hero
  var c=document.getElementById('about-canvas');
  if(c){var ctx=c.getContext('2d'),W,H,pts=[];
    function resize(){W=c.width=c.offsetWidth;H=c.height=c.offsetHeight;}
    resize();window.addEventListener('resize',resize);
    for(var i=0;i<40;i++)pts.push({x:Math.random()*1200,y:Math.random()*400,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,r:Math.random()+.5,a:Math.random()*.3+.1});
    function draw(){ctx.clearRect(0,0,W,H);pts.forEach(function(p){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(0,255,136,'+p.a+')';ctx.fill();});requestAnimationFrame(draw);}
    draw();
  }

  // Reveal
  var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:.1});
  document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});
});

function toggleFaq(el){
  var isOpen=$(el).hasClass('open');
  $('.faq-item').removeClass('open');
  if(!isOpen)$(el).addClass('open');
}

function submitContact(){
  var name=$('#cf-name').val().trim();
  var email=$('#cf-email').val().trim();
  var subject=$('#cf-subject').val().trim();
  var message=$('#cf-message').val().trim();
  var valid=true;

  $('.input-error').text('');
  $('.form-input').removeClass('input-error-state');

  if(!name){$('#cf-name').addClass('input-error-state');$('#err-cf-name').text('Name is required');valid=false;}
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$('#cf-email').addClass('input-error-state');$('#err-cf-email').text('Valid email required');valid=false;}
  if(!subject){$('#cf-subject').addClass('input-error-state');$('#err-cf-subject').text('Subject is required');valid=false;}
  if(!message||message.length<10){$('#cf-message').addClass('input-error-state');$('#err-cf-message').text('Message too short (min 10 chars)');valid=false;}
  if(!valid)return;

  $('#contact-btn-text').hide();
  $('#contact-btn-loader').show();

  $.ajax({
    url: "/contact",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({
        name: name,
        email: email,
        subject: subject,
        message: message
    }),

    success: function(data){

        $('#contact-btn-text').show();
        $('#contact-btn-loader').hide();

        if(data.success){
            $('#cf-name').val('');
            $('#cf-email').val('');
            $('#cf-subject').val('');
            $('#cf-message').val('');
            showToast('✓ Message sent! We\'ll reply within 24 hours.','success');
        }
        else{
            showToast(data.error || "Unable to send message.","error");
        }
    },

    error: function(xhr){

        $('#contact-btn-text').show();
        $('#contact-btn-loader').hide();

        if(xhr.responseJSON && xhr.responseJSON.error){
            showToast(xhr.responseJSON.error,"error");
        }
        else{
            showToast("Something went wrong. Please try again.","error");
        }
    }
});
  
}
