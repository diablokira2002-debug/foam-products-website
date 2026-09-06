/* مصنع النخبة للإسفنج - النسخة المحسنة
   ملاحظة: نظام الحسابات والطلبات هنا يعمل محليًا عبر localStorage لأغراض المشروع/العرض.
   للموقع الحقيقي يجب ربطه بقاعدة بيانات وBackend وواجهة API آمنة.
*/
$(function () {
  'use strict';

  const KEYS = {
    users: 'foam_users',
    currentUser: 'foam_user',
    cart: 'foam_cart',
    orders: 'foam_orders',
    messages: 'foam_messages'
  };

  const safeJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (e) { return fallback; }
  };
  const setJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const getUsers = () => safeJSON(KEYS.users, []);
  const getUser = () => safeJSON(KEYS.currentUser, null) || safeSessionUser();
  function safeSessionUser(){ try{return JSON.parse(sessionStorage.getItem(KEYS.currentUser)||'null')}catch(e){return null;} }
  const saveCurrentUser = user => setJSON(KEYS.currentUser, user);
  const getCart = () => safeJSON(KEYS.cart, []);

  /* ==============================================================
     عداد سلة الطلبات في شريط الرأس
     نقرأ عدد العناصر من localStorage ونضعه في العداد الموجود في HTML.
     ============================================================= */
  function updateHeaderCartCount() {
    const cart = getCart();
    const count = cart.length;

    $('#headerCartCount').text(count);

    if (count > 0) {
      $('#headerCart').addClass('has-items');
    } else {
      $('#headerCart').removeClass('has-items');
    }
  }

  /* حفظ السلة ثم تحديث السلة والعداد */
  const saveCart = cart => {
    setJSON(KEYS.cart, cart);
    renderCartEverywhere();
    updateHeaderCartCount();
  };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameRegex = /^[A-Za-z0-9_\u0600-\u06FF.-]{3,30}$/;

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  }

  function toast(message, type = 'info') {
    const cls = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
    const $t = $('<div class="app-toast '+cls+'"></div>').text(message);
    $('body').append($t);
    requestAnimationFrame(() => $t.addClass('show'));
    setTimeout(() => { $t.removeClass('show'); setTimeout(() => $t.remove(), 300); }, 2800);
  }

  if (!$('#toastStyle').length) {
    $('head').append(`<style id="toastStyle">
      .app-toast{position:fixed;bottom:24px;right:24px;background:#163B4D;color:#fff;padding:14px 22px;border-radius:12px;font-family:Tajawal,sans-serif;font-size:.95rem;z-index:10000;opacity:0;transform:translateY(12px);transition:.3s;box-shadow:0 12px 35px rgba(0,0,0,.2);max-width:min(420px,calc(100vw - 32px));}
      .app-toast.show{opacity:1;transform:translateY(0)} .app-toast.success{background:#19764a}.app-toast.error{background:#b52b35}
      .search-highlight{outline:3px solid rgba(232,130,60,.45);outline-offset:4px}
      .search-empty{padding:30px;text-align:center;background:#fff;border-radius:16px;margin:20px 0;box-shadow:0 8px 25px rgba(0,0,0,.06)}
      .password-meter{height:6px;background:#eee;border-radius:20px;overflow:hidden;margin-top:7px}.password-meter span{display:block;height:100%;width:0;transition:.25s}.password-hint{font-size:.78rem;color:#777;margin-top:5px}
      .checkout-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.checkout-form-grid .full{grid-column:1/-1}
      @media(max-width:600px){.checkout-form-grid{grid-template-columns:1fr}.checkout-form-grid .full{grid-column:auto}}
      .order-confirm-box{background:#f8fafb;border:1px solid #e5eaed;border-radius:14px;padding:15px}.order-confirm-row{display:flex;justify-content:space-between;gap:15px;padding:7px 0;border-bottom:1px dashed #ddd}.order-confirm-row:last-child{border-bottom:0;font-weight:700}
    </style>`);
  }

  // ---------------- Authentication ----------------
  function renderAuthState() {
    const user = getUser();
    if (user) {
      $('#loginBtn').addClass('d-none');
      $('#profileCircle').removeClass('d-none');
      $('#profileAvatar').attr('src', user.avatar || 'images/user-avatar-default.png');
      $('.profile-name-display').text(user.name || user.username || 'مستخدم');
    } else {
      $('#loginBtn').removeClass('d-none');
      $('#profileCircle').addClass('d-none');
    }
  }
  renderAuthState();
  updateHeaderCartCount();

  $('#logoutBtn').on('click', function () {
    localStorage.removeItem(KEYS.currentUser);
    sessionStorage.removeItem(KEYS.currentUser);
    renderAuthState();
    toast('تم تسجيل الخروج بنجاح', 'success');
    setTimeout(() => location.href = 'index.html', 500);
  });

  // Profile editing
  const $editProfileModal = $('#editProfileModal');
  if ($editProfileModal.length) {
    $editProfileModal.on('show.bs.modal', function () {
      const user = getUser() || {};
      $('#editName').val(user.name || '');
      $('#editUsername').val(user.username || '');
      $('#editAvatarPreview').attr('src', user.avatar || 'images/user-avatar-default.png');
    });
    $('#editAvatarInput').on('change', function (e) {
      const file = e.target.files[0]; if (!file) return;
      if (!file.type.startsWith('image/')) return toast('يرجى اختيار صورة صحيحة', 'error');
      const reader = new FileReader(); reader.onload = ev => $('#editAvatarPreview').attr('src', ev.target.result); reader.readAsDataURL(file);
    });
    $('#editProfileForm').on('submit', function (e) {
      e.preventDefault();
      const user = getUser(); if (!user) return toast('يجب تسجيل الدخول أولًا', 'error');
      const name = $('#editName').val().trim(), username = $('#editUsername').val().trim();
      if (name.length < 2) return toast('الاسم يجب أن يكون حرفين على الأقل', 'error');
      if (!usernameRegex.test(username)) return toast('اسم المستخدم يجب أن يكون 3 أحرف/أرقام على الأقل', 'error');
      const users = getUsers();
      const duplicate = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== user.id);
      if (duplicate) return toast('اسم المستخدم مستخدم بالفعل', 'error');
      user.name = name; user.username = username; user.avatar = $('#editAvatarPreview').attr('src') || '';
      const i = users.findIndex(u => u.id === user.id); if (i >= 0) users[i] = {...users[i], ...user};
      setJSON(KEYS.users, users); saveCurrentUser(user); renderAuthState();
      bootstrap.Modal.getOrCreateInstance($editProfileModal[0]).hide(); toast('تم حفظ التعديلات بنجاح', 'success');
    });
  }

  function goToStep($modal, step) {
    $modal.find('.step-pane').removeClass('active');
    $modal.find('.step-pane[data-step="'+step+'"]').addClass('active');
    $modal.find('.step-badge span').removeClass('active');
    $modal.find('.step-badge span[data-step="'+step+'"]').addClass('active');
  }

  // Password change / reset (demo verification code)
  let passwordCode = null;
  function sendPasswordCode() {
    passwordCode = String(Math.floor(1000 + Math.random() * 9000));
    // في النسخة الحقيقية: لا تعرض الرمز هنا، بل أرسله من السيرفر بالبريد/SMS.
    console.info('رمز التحقق التجريبي:', passwordCode);
    toast('تم إنشاء رمز التحقق التجريبي. في الموقع الحقيقي سيصل عبر البريد/SMS.', 'success');
    return passwordCode;
  }
  const $pwdModal = $('#changePasswordModal');
  if ($pwdModal.length) {
    $pwdModal.on('show.bs.modal', () => { goToStep($pwdModal, 1); $('#pwdEmailDisplay').text((getUser() || {}).email || 'غير متوفر'); });
    $('#sendCodeBtn').on('click', () => { if (!getUser()) return toast('سجّل الدخول أولًا', 'error'); sendPasswordCode(); goToStep($pwdModal, 2); });
    $('#resendCodeBtn').on('click', () => { sendPasswordCode(); });
    $('#verifyCodeForm').on('submit', function(e){
      e.preventDefault();
      const user = getUser(); const code = $('#codeInput').val().trim(); const p = $('#newPasswordInput').val(); const c = $('#confirmPasswordInput').val();
      if (code !== passwordCode) return $('#codeError').text('رمز التحقق غير صحيح').show();
      if (p.length < 8) return $('#passError').text('كلمة المرور يجب ألا تقل عن 8 خانات').show();
      if (p !== c) return $('#passError').text('كلمتا المرور غير متطابقتين').show();
      const users = getUsers(), i = users.findIndex(u => u.id === user.id); if (i < 0) return toast('تعذر العثور على الحساب','error');
      users[i].password = p; setJSON(KEYS.users, users); saveCurrentUser({...user, password:p});
      bootstrap.Modal.getOrCreateInstance($pwdModal[0]).hide(); toast('تم تغيير كلمة المرور بنجاح', 'success');
    });
  }

  // ---------------- Login page ----------------
  $('.auth-tab').on('click', function () {
    const target = $(this).data('target'); $('.auth-tab').removeClass('active'); $(this).addClass('active'); $('.auth-form').removeClass('active'); $('#'+target).addClass('active');
  });

  $('#loginForm').on('submit', function(e){
    e.preventDefault();
    const identifier = $('#loginUsername').val().trim(), password = $('#loginPassword').val(), $err = $('#loginError'); $err.hide();
    if (!identifier || !password) return $err.text('يرجى إدخال اسم المستخدم والبريد/اسم المستخدم وكلمة المرور').show();
    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === identifier.toLowerCase() || u.email.toLowerCase() === identifier.toLowerCase());
    if (!user) return $err.text('الحساب غير موجود. أنشئ حسابًا جديدًا أولًا.').show();
    if (user.password !== password) return $err.text('كلمة المرور غير صحيحة.').show();
    const clean = {...user}; saveCurrentUser(clean);
    if (!$('#rememberMe').is(':checked')) { sessionStorage.setItem(KEYS.currentUser, JSON.stringify(clean)); localStorage.removeItem(KEYS.currentUser); }
    toast('تم تسجيل الدخول بنجاح', 'success'); setTimeout(() => location.href = 'index.html', 650);
  });

  // Registration is handled by the native fallback in login.html so it still works if a library fails.

  // Password strength indicator on registration
  if ($('#registerPassword').length && !$('#registerPassword').next('.password-strength').length) {
    $('#registerPassword').after('<div class="password-strength"><div class="password-meter"><span></span></div><div class="password-hint"></div></div>');
    $('#registerPassword').on('input', function(){
      const p = this.value, score = (p.length>=8)+(p.length>=12)+(/[A-Z]/.test(p)?1:0)+(/[0-9]/.test(p)?1:0)+(/[^A-Za-z0-9]/.test(p)?1:0); const width=Math.min(100,score*20); const hint=score<3?'ضعيفة':score<5?'متوسطة':'قوية'; $(this).next('.password-strength').find('span').css('width',width+'%'); $(this).next('.password-strength').find('.password-hint').text(p?'قوة كلمة المرور: '+hint:'');
    });
  }

  // Forgot password
  const $forgotModal = $('#forgotPasswordModal'); let forgotEmail = '';
  if ($forgotModal.length) {
    $forgotModal.on('show.bs.modal', () => { goToStep($forgotModal,1); $('#forgotEmail').val(''); $('#forgotCodeInput').val(''); });
    $('#sendForgotCodeBtn').on('click', function(){
      forgotEmail = $('#forgotEmail').val().trim().toLowerCase(); if (!emailRegex.test(forgotEmail)) return toast('أدخل بريدًا إلكترونيًا صحيحًا','error');
      if (!getUsers().some(u=>u.email.toLowerCase()===forgotEmail)) return toast('لا يوجد حساب بهذا البريد','error');
      passwordCode = String(Math.floor(1000 + Math.random()*9000)); console.info('رمز الاسترجاع التجريبي:', passwordCode); toast('تم إنشاء رمز الاسترجاع التجريبي. في الموقع الحقيقي سيصل عبر البريد.', 'success'); goToStep($forgotModal,2);
    });
    $('#forgotVerifyForm').on('submit', function(e){
      e.preventDefault(); const code=$('#forgotCodeInput').val().trim(), p=$('#forgotNewPassword').val();
      if(code!==passwordCode) return toast('رمز التحقق غير صحيح','error'); if(p.length<8) return toast('كلمة المرور يجب ألا تقل عن 8 خانات','error');
      const users=getUsers(), i=users.findIndex(u=>u.email.toLowerCase()===forgotEmail); if(i<0) return toast('تعذر العثور على الحساب','error'); users[i].password=p; setJSON(KEYS.users,users);
      bootstrap.Modal.getOrCreateInstance($forgotModal[0]).hide(); toast('تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن','success');
    });
  }

  // ---------------- Products ----------------
  // المنتجات المعروضة في النسخة التجريبية — الأسعار استرشادية وقابلة للتعديل.
  const productCategories = [
    {title:'إسفنج المراتب',icon:'fa-bed',items:[
      {name:'مرتبة إسفنج كثافة عالية',description:'مرتبة مريحة للاستخدام اليومي، مناسبة لغرف النوم والاستعمال المنزلي.',density:'كثافة 35–40',sizes:'90×190 / 120×200 / 160×200 سم',price:18000,img:'images/products/mattress-1.png'},
      {name:'مرتبة إسفنج طبي',description:'طبقات إسفنج متوازنة للراحة والدعم، مع إمكانية تنفيذ المقاس حسب الطلب.',density:'كثافة 32–38',sizes:'100×200 / 140×200 سم',price:25000,img:'images/products/mattress-2.png'},
      {name:'مرتبة إسفنج مزدوجة الطبقات',description:'طبقتان من الإسفنج لراحة أفضل وثبات أعلى في الاستخدام اليومي.',density:'طبقتان مختلفتان',sizes:'160×200 / 180×200 سم',price:32000,img:'images/products/mattress-3.png'},
      {name:'مرتبة إسفنج أطفال',description:'مقاس عملي للأطفال وخفيفة الوزن، ويمكن تنفيذ مقاسات أخرى حسب الطلب.',density:'كثافة متوسطة',sizes:'70×140 سم',price:12000,img:'images/products/mattress-4.png'}]},
    {title:'إسفنج الكنب والمجالس',icon:'fa-couch',items:[
      {name:'إسفنج كنب كثافة 30',description:'إسفنج مناسب للمقاعد والظهر في الكنب والمجالس مع قص حسب المقاس.',density:'كثافة 30',sizes:'حسب الطلب، سمك 5–15 سم',price:3500,img:'images/products/sofa-1.png'},
      {name:'إسفنج كنب فاخر',description:'خيار مريح للمجالس والكنب التي تحتاج سماكة ودعمًا أعلى.',density:'كثافة 35–40',sizes:'حسب الطلب، سمك 5–20 سم',price:5000,img:'images/products/sofa-2.png'},
      {name:'وسائد إسفنج ديكور',description:'قطع إسفنج للوسائد والديكور الداخلي، مع إمكانية اختيار المقاس.',density:'كثافة متوسطة',sizes:'45×45 / 50×50 سم',price:2500,img:'images/products/sofa-3.png'}]},
    {title:'إسفنج السيارات والمقصورات',icon:'fa-car',items:[
      {name:'إسفنج مقاعد سيارات',description:'قص إسفنج للمقاعد حسب شكل ومقاس المقعد، مناسب لأعمال التنجيد.',density:'كثافة عالية',sizes:'حسب مقاس المقعد',price:6500,img:'images/products/car-1.png'},
      {name:'إسفنج عزل صوت للسيارة',description:'ألواح إسفنج للحماية والعزل الداخلي في تطبيقات السيارات.',density:'كثافة 25–30',sizes:'100×100 سم',price:4500,img:'images/products/car-2.png'},
      {name:'إسفنج تنجيد مقصورة',description:'إسفنج مرن لتنجيد الأبواب والمقصورة والأسطح الداخلية.',density:'كثافة متوسطة',sizes:'حسب الطلب',price:6000,img:'images/products/car-3.png'},
      {name:'إسفنج مساند رأس',description:'قطع إسفنج لمساند الرأس والمكونات الصغيرة في أعمال التنجيد.',density:'كثافة عالية',sizes:'مقاسات متعددة',price:2000,img:'images/products/car-4.png'}]},
    {title:'إسفنج التغليف والحماية',icon:'fa-box',items:[
      {name:'إسفنج تغليف أجهزة',description:'قطع إسفنج لحماية الأجهزة والمنتجات أثناء النقل والتخزين.',density:'كثافة خفيفة–متوسطة',sizes:'100×50×5 سم',price:2500,img:'images/products/pack-1.png'},
      {name:'إسفنج حماية زجاج',description:'إسفنج فاصل وواقٍ للزجاج والقطع الحساسة أثناء التغليف.',density:'مرن وممتص للصدمات',sizes:'120×80×3 سم',price:3000,img:'images/products/pack-2.png'},
      {name:'إسفنج تغليف صناعي بالجملة',description:'رولات وأحجام مناسبة للتغليف الصناعي والكميات الكبيرة.',density:'حسب الطلب',sizes:'رول 1×10 م',price:15000,img:'images/products/pack-3.png'}]}
  ];
  window.foamProducts = productCategories;

  function allProducts(){ return productCategories.flatMap((c,ci)=>c.items.map((p,pi)=>({...p,catIndex:ci,itemIndex:pi}))); }
  // إضافة منتج جاهز من صفحة المنتجات إلى السلة مباشرة بدون الانتقال إلى صفحة الطلب المخصص.
  function productToCart(product){
    const item={
      id:'product_'+Date.now()+'_'+Math.floor(Math.random()*1000),
      productName:product.name,
      productImage:product.img,
      foamType:product.density || 'منتج جاهز',
      foamValue:'catalog',
      upholsteryType:'حسب المنتج',
      upholsteryValue:'catalog',
      softLayerType:'حسب المنتج',
      softLayerValue:'catalog',
      noSoftLayer:false,
      softTop:0,
      softBottom:0,
      length:0,
      width:0,
      height:0,
      effectiveHeight:0,
      qty:1,
      total:Number(product.price||0),
      unitPrice:Number(product.price||0),
      sizeText:product.sizes || 'حسب الطلب',
      createdAt:new Date().toISOString()
    };
    const cart=getCart();
    cart.push(item);
    saveCart(cart);
    toast('تمت إضافة «'+product.name+'» إلى السلة بنجاح','success');
    return item;
  }

  // إنشاء عنصر طلب مباشر لزر «اطلب هذا المنتج»؛ لا يضيفه للسلة إلا بعد تأكيد الإرسال.
  function productToOrderItem(product){
    return {
      id:'direct_'+Date.now()+'_'+Math.floor(Math.random()*1000),
      productName:product.name,
      productImage:product.img,
      foamType:product.density || 'منتج جاهز',
      foamValue:'catalog',
      upholsteryType:'حسب المنتج',
      upholsteryValue:'catalog',
      softLayerType:'حسب المنتج',
      softLayerValue:'catalog',
      noSoftLayer:false,
      softTop:0, softBottom:0,
      length:0, width:0, height:0, effectiveHeight:0,
      qty:1,
      total:Number(product.price||0),
      unitPrice:Number(product.price||0),
      sizeText:product.sizes || 'حسب الطلب',
      createdAt:new Date().toISOString()
    };
  }

  const $productsWrap=$('#productsWrap');
  if($productsWrap.length){
    productCategories.forEach((cat,ci)=>{
      const $row=$('<section class="product-row"></section>');
      $row.append('<div class="product-row-head"><i class="fa-solid '+cat.icon+'"></i><div><h2>'+escapeHTML(cat.title)+'</h2><small>منتجات متاحة حسب المقاس والاستخدام</small></div></div>');
      const $grid=$('<div class="product-grid"></div>');
      cat.items.forEach((item,pi)=>{
        $grid.append(`<article class="product-card" data-search="${escapeHTML((item.name+' '+item.sizes+' '+item.description+' '+item.density+' '+cat.title).toLowerCase())}">
          <div class="product-card-img"><img src="${item.img}" alt="${escapeHTML(item.name)}" loading="lazy"></div>
          <div class="product-card-body">
            <span class="product-badge">${escapeHTML(item.density)}</span>
            <h3>${escapeHTML(item.name)}</h3>
            <p class="product-description">${escapeHTML(item.description)}</p>
            <div class="product-sizes"><i class="fa-solid fa-ruler"></i> ${escapeHTML(item.sizes)}</div>
            <div class="product-price-row"><div><span class="price-label">السعر الاسترشادي</span><span class="product-price">${item.price.toLocaleString('ar-YE')} <small>ر.ي</small></span></div><div class="product-actions"><button class="btn btn-outline btn-details" data-ci="${ci}" data-pi="${pi}">التفاصيل</button><button class="btn-add" data-ci="${ci}" data-pi="${pi}" title="إضافة إلى السلة" aria-label="إضافة إلى السلة"><i class="fa-solid fa-cart-plus"></i></button></div></div>
          </div>
        </article>`);
      });
      $row.append($grid); $productsWrap.append($row);
    });
    $productsWrap.on('click','.btn-add',function(){ productToCart(productCategories[$(this).data('ci')].items[$(this).data('pi')]); });
    $productsWrap.on('click','.btn-details',function(){
      const p=productCategories[$(this).data('ci')].items[$(this).data('pi')];
      if(!$('#productDetailsModal').length){ $('body').append(`<div class="modal fade" id="productDetailsModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">تفاصيل المنتج</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="productDetailsBody"></div><div class="modal-footer detail-actions"><button type="button" class="btn btn-primary" id="detailsOrderBtn"><i class="fa-solid fa-clipboard-check"></i> اطلب هذا المنتج</button><button type="button" class="btn btn-outline" id="detailsAddCartBtn"><i class="fa-solid fa-cart-plus"></i> إضافة إلى السلة</button></div></div></div></div>`); }
      $('#productDetailsBody').html(`<div class="product-detail-layout"><img src="${p.img}" alt="${escapeHTML(p.name)}"><div><span class="product-badge">${escapeHTML(p.density)}</span><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.description)}</p><ul class="product-detail-list"><li><b>المقاسات:</b> ${escapeHTML(p.sizes)}</li><li><b>السعر الاسترشادي:</b> ${p.price.toLocaleString('ar-YE')} ر.ي</li><li><b>التنفيذ:</b> جاهز أو حسب الطلب</li></ul><div class="detail-note">السعر المعروض للاستعراض داخل المشروع وقابل للتعديل حسب أسعار المصنع الفعلية والمقاس والكمية.</div></div></div>`);
      $('#detailsOrderBtn').off('click').on('click',()=>{ bootstrap.Modal.getOrCreateInstance($('#productDetailsModal')[0]).hide(); setTimeout(()=>openCheckoutForItems([productToOrderItem(p)]),250); });
      $('#detailsAddCartBtn').off('click').on('click',()=>{ productToCart(p); bootstrap.Modal.getOrCreateInstance($('#productDetailsModal')[0]).hide(); });
      bootstrap.Modal.getOrCreateInstance($('#productDetailsModal')[0]).show();
    });
  }

  // Global product search: products page filters; other pages redirect to products with query.
  $('.search-form').on('submit',function(e){ e.preventDefault(); const q=$(this).find('.search-input').val().trim(); if(!q) return toast('اكتب اسم المنتج أولًا'); if($('#productsWrap').length){ filterProducts(q); } else location.href='products.html?search='+encodeURIComponent(q); });
  function filterProducts(q){
    const query=q.toLowerCase(); let count=0;
    $('.product-card').each(function(){ const ok=$(this).data('search').includes(query); $(this).toggle(ok); if(ok)count++; });
    $('.product-row').each(function(){ $(this).toggle($(this).find('.product-card:visible').length>0); });
    $('#productSearchResult').remove();
    $productsWrap.before('<div id="productSearchResult" class="search-empty">نتائج البحث عن <b>"'+escapeHTML(q)+'"</b>: '+count+' منتج</div>');
  }
  const params=new URLSearchParams(location.search); if($('#productsWrap').length && params.get('search')) filterProducts(params.get('search'));

  // ---------------- Custom order + cart ----------------
  // نموذج طلب المنتجات الجديد مطابق لفكرة المخطط الورقي المرفق.
  const $orderForm=$('#customOrderForm');
  if($orderForm.length){
    const rates={super:.018,regular:.015,medium:.018,high:.022,medical:.03};
    const upholsteryRates={striped:1.00,plain:1.02,velvet:1.08,leather:1.12,none:.92};
    const softRates={super:1.06,memory:1.12,fiber:1.04,none:1};
    const selected=safeJSONFromSession('foam_selected_product');
    if(selected){
      $('#foamType').data('selectedProduct',selected);
      $('.sketch-order-title p').after('<div class="selected-product-note">المنتج المختار: <b>'+escapeHTML(selected.name)+'</b> — السعر الاسترشادي '+Number(selected.price||0).toLocaleString('ar-YE')+' ر.ي</div>');
      sessionStorage.removeItem('foam_selected_product');
    }

    function n(id){return Math.max(0,Number($('#'+id).val())||0);}
    function calc(){
      const l=n('dimLength'),w=n('dimWidth'),h=n('dimHeight'),q=Math.max(1,Number($('#dimQty').val())||1);
      const type=$('#foamType').val()||'super';
      const upholstery=$('#upholsteryType').val()||'striped';
      const soft=$('#softLayerType').val()||'super';
      const top=n('softTop'),bottom=n('softBottom');
      const effectiveHeight=h+top+bottom;
      let unit=l*w*effectiveHeight*(rates[type]||rates.super);
      unit*=upholsteryRates[upholstery]||1;
      unit*=softRates[soft]||1;
      if($('#noSoftLayer').is(':checked')) unit*=.96;
      const total=unit*q;
      $('#summaryUnitPrice').text(unit>0?unit.toLocaleString('ar-YE',{maximumFractionDigits:0})+' ر.ي':'—');
      $('#summaryTotalPrice').text(total>0?total.toLocaleString('ar-YE',{maximumFractionDigits:0})+' ر.ي':'—');
      $('#previewLength').text(l||0); $('#previewWidth').text(w||0); $('#previewHeight').text(effectiveHeight||0);
      const scale=Math.max(1,Math.min(1.35,1+(h/100)));
      $('#foamStack').css('transform','scaleY('+scale+')');
      return {unit,total,l,w,h,top,bottom,q,type,upholstery,soft,effectiveHeight};
    }

    $orderForm.on('input change','input,select',calc);
    $('#noSoftLayer').on('change',function(){
      const disabled=this.checked;
      $('#softLayerType,#softTop,#softBottom').prop('disabled',disabled);
      if(disabled){$('#softTop,#softBottom').val(0);}
      calc();
    });
    $('#qtyPlus').on('click',function(){const q=Math.max(1,Number($('#dimQty').val())||1);$('#dimQty').val(q+1).trigger('input');});
    $('#qtyMinus').on('click',function(){const q=Math.max(1,Number($('#dimQty').val())||1);$('#dimQty').val(Math.max(1,q-1)).trigger('input');});

    $orderForm.on('submit',function(e){
      e.preventDefault();
      const d=calc();
      if(!d.l||!d.w||!d.h||!d.total)return toast('يرجى إدخال الطول والعرض والارتفاع بشكل صحيح','error');
      const product=$('#foamType').data('selectedProduct')||null;
      const item={
        id:'item_'+Date.now(),
        productName:product?.name||'طلب إسفنج حسب المقاس',
        productImage:product?.img||'images/products/mattress-1.jpg',
        foamType:$('#foamType option:selected').text(),foamValue:d.type,
        upholsteryType:$('#upholsteryType option:selected').text(),upholsteryValue:d.upholstery,
        softLayerType:$('#softLayerType option:selected').text(),softLayerValue:d.soft,
        noSoftLayer:$('#noSoftLayer').is(':checked'),softTop:d.top,softBottom:d.bottom,
        length:d.l,width:d.w,height:d.h,effectiveHeight:d.effectiveHeight,qty:d.q,total:d.total,unitPrice:d.unit,
        createdAt:new Date().toISOString()
      };
      const cart=getCart();cart.push(item);saveCart(cart);toast('تمت إضافة الطلب إلى السلة بنجاح','success');
      this.reset();$('#dimQty').val(1);$('#noSoftLayer').prop('checked',false);$('#softLayerType,#softTop,#softBottom').prop('disabled',false);$('#softTop,#softBottom').val(0);$('#foamType').removeData('selectedProduct');$('.selected-product-note').remove();calc();
    });
    calc();
  }

  function safeJSONFromSession(key){try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch(e){return null}}

  function renderCartEverywhere(){
    const cart=getCart(),$list=$('#cartItemsList'); if(!$list.length)return; $list.empty();
    if(!cart.length)$list.html('<p class="cart-empty">السلة فارغة، ابدأ بتكوين أول طلب من النموذج أعلاه.</p>');
    cart.forEach((item,index)=>$list.append(`<div class="cart-item sketch-cart-item">
      <div class="cart-item-info"><div class="cart-product-title"><span class="cart-product-thumb"><img src="${escapeHTML(item.productImage||'images/products/mattress-1.jpg')}" alt=""></span><div><b>${escapeHTML(item.productName||item.foamType||'طلب إسفنج')}</b><span>${escapeHTML(item.foamType||'')} — ${escapeHTML(item.upholsteryType||'بدون تنجيد')}</span></div></div>
      <div class="cart-specs"><span>${item.sizeText ? escapeHTML(item.sizeText) : ((item.length||0)+' × '+(item.width||0)+' × '+(item.height||0)+' سم')}</span><span>الكمية: ${item.qty}</span><span>${escapeHTML(item.softLayerType||'بدون طبقة ناعمة')}</span></div></div>
      <div class="cart-item-price"><strong>${Number(item.total||0).toLocaleString('ar-YE')} ر.ي</strong><button class="cart-remove" data-index="${index}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button></div>
    </div>`));
    const total=cart.reduce((s,i)=>s+Number(i.total||0),0);$('#cartGrandTotal').text(total.toLocaleString('ar-YE')+' ر.ي');$('#cartCount').text(cart.length);
  }
  if($('#cartItemsList').length){renderCartEverywhere();$('#cartItemsList').on('click','.cart-remove',function(){const c=getCart();c.splice(+$(this).data('index'),1);saveCart(c);toast('تم حذف العنصر','success');});}

  // ================= بيانات تأكيد الطلب =================
  // هذه الدوال مشتركة بين «اطلب هذا المنتج» وبين زر إتمام الطلب من السلة.
  function ensureCheckoutModal(){
    if(!$('#checkoutModal').length){
      $('body').append(`<div class="modal fade" id="checkoutModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content"><div class="modal-header"><h5 class="modal-title"><i class="fa-solid fa-clipboard-check"></i> بيانات تأكيد الطلب</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><form id="checkoutForm"><div class="modal-body"><div class="checkout-form-grid"><div><label>الاسم الكامل</label><input id="customerName" class="form-control" required></div><div><label>رقم الهاتف</label><input id="customerPhone" class="form-control" inputmode="tel" required></div><div><label>المدينة</label><input id="customerCity" class="form-control" required></div><div><label>المنطقة / الحي</label><input id="customerArea" class="form-control" required></div><div class="full"><label>العنوان التفصيلي</label><input id="customerAddress" class="form-control" required></div><div class="full"><label>ملاحظات</label><textarea id="customerNotes" class="form-control" rows="3"></textarea></div></div><div class="order-confirm-box mt-3" id="checkoutSummary"></div></div><div class="modal-footer"><button type="submit" class="btn btn-primary btn-block"><i class="fa-solid fa-check"></i> إرسال الطلب</button></div></form></div></div></div>`);
    }
  }

  let checkoutItems=[];
  let checkoutFromCart=false;
  function openCheckoutForItems(items, fromCart=false){
    checkoutItems=Array.isArray(items)?items:[];
    checkoutFromCart=fromCart;
    if(!checkoutItems.length)return toast('لا يوجد منتج لتأكيد الطلب','error');
    ensureCheckoutModal();
    const user=getUser();
    $('#customerName').val(user?.name||'');
    $('#customerPhone').val(user?.phone||'');
    $('#customerCity').val(user?.city||'');
    const total=checkoutItems.reduce((s,i)=>s+Number(i.total||0),0);
    $('#checkoutSummary').html(
      checkoutItems.map(i=>`<div class="order-confirm-row"><span>${escapeHTML(i.productName||'منتج')}</span><b>${Number(i.total||0).toLocaleString('ar-YE')} ر.ي</b></div>`).join('')+
      `<div class="order-confirm-row"><span>عدد العناصر</span><b>${checkoutItems.length}</b></div><div class="order-confirm-row"><span>الإجمالي</span><b>${total.toLocaleString('ar-YE')} ر.ي</b></div>`
    );
    bootstrap.Modal.getOrCreateInstance($('#checkoutModal')[0]).show();
  }

  // إتمام الطلب من صفحة السلة.
  if($('#checkoutBtn').length){
    $('#checkoutBtn').on('click',function(){
      const cart=getCart();
      if(!cart.length)return toast('السلة فارغة','error');
      openCheckoutForItems(cart,true);
    });
  }

  $(document).on('submit','#checkoutForm',function(e){
    e.preventDefault();
    if(!checkoutItems.length)return toast('لا يوجد منتج لتأكيد الطلب','error');
    const order={
      id:'ORD-'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'-'+Math.floor(Math.random()*90+10),
      customer:{name:$('#customerName').val().trim(),phone:$('#customerPhone').val().trim(),city:$('#customerCity').val().trim(),area:$('#customerArea').val().trim(),address:$('#customerAddress').val().trim(),notes:$('#customerNotes').val().trim()},
      delivery:'pickup',
      items:checkoutItems,
      total:checkoutItems.reduce((s,i)=>s+Number(i.total||0),0),
      status:'جديد',createdAt:new Date().toISOString(),userId:getUser()?.id||null
    };
    if(!order.customer.name||!order.customer.phone||!order.customer.city||!order.customer.area||!order.customer.address)return toast('يرجى تعبئة بيانات العميل كاملة','error');
    const orders=safeJSON(KEYS.orders,[]);orders.push(order);setJSON(KEYS.orders,orders);
    if(getUser()){const u=getUser();u.phone=order.customer.phone;u.city=order.customer.city;saveCurrentUser(u);}
    if(checkoutFromCart){localStorage.removeItem(KEYS.cart);renderCartEverywhere();updateHeaderCartCount();}
    checkoutItems=[];
    checkoutFromCart=false;
    bootstrap.Modal.getOrCreateInstance($('#checkoutModal')[0]).hide();
    toast('تم إنشاء الطلب '+order.id+' بنجاح','success');
    setTimeout(()=>alert('رقم طلبك: '+order.id+'\nاحتفظ به لمتابعة طلبك.'),350);
  });

  // ================= سلة المنتجات داخل صفحة المنتجات =================
  function openHeaderCart(){
    const cart=getCart();
    if(!$('#headerCartModal').length){
      $('body').append(`<div class="modal fade" id="headerCartModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content"><div class="modal-header"><h5 class="modal-title"><i class="fa-solid fa-cart-shopping"></i> سلة الطلبات</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="headerCartBody"></div><div class="modal-footer"><a href="order.html#cart" class="btn btn-outline" id="openFullCartBtn">فتح السلة كاملة</a><button type="button" class="btn btn-primary" id="headerCartCheckoutBtn">تأكيد الطلب</button></div></div></div></div>`);
      $('#headerCartCheckoutBtn').on('click',function(){const c=getCart();if(!c.length)return toast('السلة فارغة','error');bootstrap.Modal.getOrCreateInstance($('#headerCartModal')[0]).hide();setTimeout(()=>openCheckoutForItems(c,true),250);});
      $('#openFullCartBtn').on('click',function(){bootstrap.Modal.getOrCreateInstance($('#headerCartModal')[0]).hide();});
    }
    const body=$('#headerCartBody');
    if(!cart.length){body.html('<p class="cart-empty">السلة فارغة.</p>');}
    else{body.html(cart.map((i,index)=>`<div class="cart-item sketch-cart-item"><div class="cart-item-info"><div class="cart-product-title"><span class="cart-product-thumb"><img src="${escapeHTML(i.productImage||'images/products/mattress-1.jpg')}" alt=""></span><div><b>${escapeHTML(i.productName||'منتج')}</b><span>${escapeHTML(i.sizeText||i.foamType||'')}</span></div></div></div><div class="cart-item-price"><strong>${Number(i.total||0).toLocaleString('ar-YE')} ر.ي</strong><button class="cart-remove header-cart-remove" data-index="${index}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button></div></div>`).join(''));}
    bootstrap.Modal.getOrCreateInstance($('#headerCartModal')[0]).show();
  }

  $(document).on('click','.header-cart-remove',function(){const c=getCart();c.splice(+$(this).data('index'),1);saveCart(c);openHeaderCart();toast('تم حذف العنصر','success');});
  $(document).on('click','#headerCart',function(e){
    // في صفحة المنتجات لا ننتقل إلى صفحة «اطلب حسب طلبك»؛ نعرض السلة مباشرة.
    if($('#productsWrap').length){e.preventDefault();openHeaderCart();}
  });

  // ---------------- Contact ----------------
  $('#contactForm').on('submit',function(e){e.preventDefault();const name=$('#contactName').val().trim(),email=$('#contactEmail').val().trim(),subject=$('#contactSubject').val().trim(),msg=$('#contactMessage').val().trim(),$fb=$('#contactFeedback');if(!name||!email||!subject||!msg){$fb.removeClass('success').addClass('error').text('يرجى تعبئة جميع الحقول').show();return;}if(!emailRegex.test(email)){$fb.removeClass('success').addClass('error').text('يرجى إدخال بريد إلكتروني صحيح').show();return;}const messages=safeJSON(KEYS.messages,[]);messages.push({id:'MSG-'+Date.now(),name,email,subject,message:msg,createdAt:new Date().toISOString(),status:'جديد'});setJSON(KEYS.messages,messages);$fb.removeClass('error').addClass('success').text('تم حفظ رسالتك بنجاح، وسيتم التواصل معك قريبًا.').show();this.reset();});

  // Footer years
  $('[id="yearNow"]').text(new Date().getFullYear());
});
